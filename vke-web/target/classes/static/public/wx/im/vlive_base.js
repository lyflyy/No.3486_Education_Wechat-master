//将汉字转Unicode
function enUnicode(theString) {
    var unicodeString = '';
    for (var i = 0; i < theString.length; i++) {
        var theUnicode = theString.charCodeAt(i).toString(16).toUpperCase();
        while (theUnicode.length < 4) {
            theUnicode = '0' + theUnicode;
        }
        theUnicode = '\\u' + theUnicode;
        unicodeString += theUnicode;
    }
    return unicodeString;
}


function deUnicode(str) {
    return unescape(str.replace(/\\u/g, '%u'));
}
/**
 * 获取 唯一随机数 作为当前课程消息唯一判断(因为腾讯云通信不带msgseq,也不能传递多余字段，只能这么处理)
 * 主要用于消息红包
 * @param uid
 * @returns {*}
 */
function getMsgRandom(uid) {
    // var ran = Math.round(Math.random() * 4294967296);
    currentMsgSeq += 1;

    // var r = [ran , uid ,currentMsgSeq].join("");
    // //console.log("::::::::;"+r)
    return vlive.liveId + uid + currentMsgSeq;

}

//IE9(含)以下浏览器用到的jsonp回调函数
function jsonpCallback(rspData) {
    //设置接口返回的数据
    webim.setJsonpLastRspData(rspData);
}

//监听大群新消息（普通，点赞，提示，红包）
function onBigGroupMsgNotify(msgList) {
    for (var i = msgList.length - 1; i >= 0; i--) {//遍历消息，按照时间从后往前
        var msg = msgList[i];
        ////console.warn(msg);
        webim.Log.warn('receive a new avchatroom group msg: ' + msg.getFromAccountNick());
        //显示收到的消息
        showMsg(msg);
    }
}

//监听新消息(私聊(包括普通消息、全员推送消息)，普通群(非直播聊天室)消息)事件
//newMsgList 为新消息数组，结构为[Msg]
function onMsgNotify(newMsgList) {
    var newMsg;
    for (var j in newMsgList) {//遍历新消息
        newMsg = newMsgList[j];
        handlderMsg(newMsg);//处理新消息
    }
}

//处理消息（私聊(包括普通消息和全员推送消息)，普通群(非直播聊天室)消息）
function handlderMsg(msg) {
    var fromAccount, fromAccountNick, sessType, subType, contentHtml;

    fromAccount = msg.getFromAccount();
    if (!fromAccount) {
        fromAccount = '';
    }
    fromAccountNick = msg.getFromAccountNick();
    if (!fromAccountNick) {
        fromAccountNick = fromAccount;
    }

    //解析消息
    //获取会话类型
    //webim.SESSION_TYPE.GROUP-群聊，
    //webim.SESSION_TYPE.C2C-私聊，
    sessType = msg.getSession().type();
    //获取消息子类型
    //会话类型为群聊时，子类型为：webim.GROUP_MSG_SUB_TYPE
    //会话类型为私聊时，子类型为：webim.C2C_MSG_SUB_TYPE
    subType = msg.getSubType();

    switch (sessType) {
        case webim.SESSION_TYPE.C2C://私聊消息
            switch (subType) {
                case webim.C2C_MSG_SUB_TYPE.COMMON://c2c普通消息
                    //业务可以根据发送者帐号fromAccount是否为app管理员帐号，来判断c2c消息是否为全员推送消息，还是普通好友消息
                    //或者业务在发送全员推送消息时，发送自定义类型(webim.MSG_ELEMENT_TYPE.CUSTOM,即TIMCustomElem)的消息，在里面增加一个字段来标识消息是否为推送消息
                    contentHtml = convertMsgtoHtml(msg);
                    webim.Log.warn('receive a new c2c msg: fromAccountNick=' + fromAccountNick + ", content=" + contentHtml);
                    //c2c消息一定要调用已读上报接口
                    var opts = {
                        'To_Account': fromAccount,//好友帐号
                        'LastedMsgTime': msg.getTime()//消息时间戳
                    };
                    webim.c2CMsgReaded(opts);
                    alert('收到一条c2c消息(好友消息或者全员推送消息): 发送人=' + fromAccountNick + ", 内容=" + contentHtml);
                    break;
            }
            break;
        case webim.SESSION_TYPE.GROUP://普通群消息，对于直播聊天室场景，不需要作处理
            break;
    }
}

//sdk登录
function sdkLogin(loginInfo, listeners, options) {
    //web sdk 登录
    webim.login(loginInfo, listeners, options,
        function (identifierNick) {
            //identifierNick为登录用户昵称(没有设置时，为帐号)，无登录态时为空
            webim.Log.info('webim登录成功');
            applyJoinBigGroup(avChatRoomId);//加入大群
            // hideDiscussForm();//隐藏评论表单
            initEmotionUL();//初始化表情
        },
        function (err) {
            alert(err.ErrorInfo);
        }
    );//
}

//进入大群
function applyJoinBigGroup(groupId) {
    var options = {
        'GroupId': groupId//群id
    };
    webim.applyJoinBigGroup(
        options,
        function (resp) {
            //JoinedSuccess:加入成功; WaitAdminApproval:等待管理员审批
            if (resp.JoinedStatus && resp.JoinedStatus == 'JoinedSuccess') {
                webim.Log.info('进群成功');
                selToID = groupId;
            } else {
                alert('进群失败');
            }
        },
        function (err) {
            alert(err.ErrorInfo);
        }
    );
}
var chatListLastHeight = 0;
function showHistroyMsg(msg) {
    var isSelfSend, sessType, subType;
    var $chatList, itemHtml;

    $chatList = $("#history-list");
    //解析消息
    //获取会话类型，目前只支持群聊
    //webim.SESSION_TYPE.GROUP-群聊，
    //webim.SESSION_TYPE.C2C-私聊，
    sessType = msg.getSession().type();
    //获取消息子类型
    //会话类型为群聊时，子类型为：webim.GROUP_MSG_SUB_TYPE
    //会话类型为私聊时，子类型为：webim.C2C_MSG_SUB_TYPE
    subType = msg.getSubType();

    isSelfSend = msg.getIsSend();//消息是否为自己发的


    switch (subType) {

        case webim.GROUP_MSG_SUB_TYPE.COMMON://群普通消息
            itemHtml = convertMsgtoHtml(msg);
            break;
        case webim.GROUP_MSG_SUB_TYPE.REDPACKET://群红包消息
            itemHtml = convertMsgtoHtml(msg);
            break;
        case webim.GROUP_MSG_SUB_TYPE.LOVEMSG://群点赞消息
            //业务自己可以增加逻辑，比如展示点赞动画效果
            itemHtml = convertMsgtoHtml(msg);
            //展示点赞动画
            showLoveMsgAnimation();
            break;
        case webim.GROUP_MSG_SUB_TYPE.TIP://群提示消息
            itemHtml = convertMsgtoHtml(msg);
            break;
    }

    $chatList.append(itemHtml);
}


//显示消息（群普通+点赞+提示+红包）
function showMsg(msg) {
    var isSelfSend, sessType, subType;
    var $chatList, itemHtml;

    $chatList = $("#chat-list");
    // var maxDisplayMsgCount = 100000;
    // //var opacityStep=(1.0/4).toFixed(2);
    // var opacityStep = 0.4;
    // var opacity;
    // var childrenLiList = $("#chat-list").children();
    // if (childrenLiList.length == maxDisplayMsgCount) {
    //     $("#chat-list").children(":first").remove();
    //     for (var i = 0; i < maxDisplayMsgCount; i++) {
    //         opacity = opacityStep * (i + 1) + 0.6;
    //         $('#chat-list').children().eq(i).css("opacity", opacity);
    //     }
    // }

    //解析消息
    //获取会话类型，目前只支持群聊
    //webim.SESSION_TYPE.GROUP-群聊，
    //webim.SESSION_TYPE.C2C-私聊，
    sessType = msg.getSession().type();
    //获取消息子类型
    //会话类型为群聊时，子类型为：webim.GROUP_MSG_SUB_TYPE
    //会话类型为私聊时，子类型为：webim.C2C_MSG_SUB_TYPE
    subType = msg.getSubType();
    //如果正在加载历史消息(系统消息排除)
    if (subType !== webim.GROUP_MSG_SUB_TYPE.TIP && vlive.hasHistoryMsg) return;

    isSelfSend = msg.getIsSend();//消息是否为自己发的


    switch (subType) {

        case webim.GROUP_MSG_SUB_TYPE.COMMON://群普通消息
            itemHtml = convertMsgtoHtml(msg);
            break;
        case webim.GROUP_MSG_SUB_TYPE.REDPACKET://群红包消息
            itemHtml = convertMsgtoHtml(msg);
            break;
        case webim.GROUP_MSG_SUB_TYPE.LOVEMSG://群点赞消息
            //业务自己可以增加逻辑，比如展示点赞动画效果
            itemHtml = convertMsgtoHtml(msg);
            //展示点赞动画
            showLoveMsgAnimation();
            break;
        case webim.GROUP_MSG_SUB_TYPE.TIP://群提示消息
            itemHtml = convertMsgtoHtml(msg);
            break;
    }

    $chatList.append(itemHtml);
    //自动滚动
    scrollToBottom();

}

function scrollToBottom() {
    var currentHeight = $("#chat-list").height();
    var diffHeight = currentHeight - chatListLastHeight;
    // if (diffHeight>0){
    $('#live-page').animate({scrollTop: currentHeight}, 0);
    chatListLastHeight = currentHeight;
    // }
}


function convertAvatarHtml(uid, msgSeq) {
    if (!uid || uid.indexOf('@TIM#') >= 0) {
        return "";
    }
    var tpl = '<div class="avatar-wrap"> <img class="avatar" data-uid="#uid#" src="#avatar#"> <a data-mseq="#msgSeq#" data-uid="#uid#" class="play_tour">赏</a></div>'
    var uinfo = vlive.studentList[uid];
    // console.log(uinfo);
    tpl = tpl.replace(/#avatar#/, uinfo.avatar).replace(/#msgSeq#/, msgSeq).replace(/#uid#/g, uinfo.studentid);
    return tpl;
}
//把消息转换成Html
function convertMsgtoHtml(msg) {
    var html = "", elems, elem, type, content, fromAccount, isExpire;

    fromAccount = msg.getFromAccount();
    if (!fromAccount) {
        fromAccount = '';
    }
    // console.log(":::::::" + msg.time);
    isExpire = msg.isExpire;
    elems = msg.getElems();//获取消息包含的元素数组
    for (var i in elems) {
        var contentObj, typeClass;
        var $item = $('<div class="chat_item">');
        var $msgWrap = $('<div class="weui-flex__item msg">');
        var $contentWrap = $('<div class="content">');
        elem = elems[i];
        type = elem.getType();//获取元素类型
        content = elem.getContent();//获取元素对象
        var random = msg.getRandom();
        $item.attr("data-random", random);
        switch (type) {
            case webim.MSG_ELEMENT_TYPE.TEXT:
                $item.append(convertAvatarHtml(fromAccount, random));
                contentObj = convertTextMsgToHtml(content);
                break;
            case webim.MSG_ELEMENT_TYPE.IMAGE:
                $item.append(convertAvatarHtml(fromAccount, random));
                contentObj = convertImageMsgToHtml(content);
                break;
            case webim.MSG_ELEMENT_TYPE.SOUND:
                $item.append(convertAvatarHtml(fromAccount, random));
                contentObj = convertSoundMsgToHtml(content);
                break;
            case webim.MSG_ELEMENT_TYPE.CUSTOM:
                contentObj = convertCustomMsgToHtml(content, isExpire);
                if (contentObj) {
                    if (contentObj.isVoice) {
                        $contentWrap = $('<div class="content" data-seq="' + msg.seq + '" onclick="onWxVoicePlay(this)">');
                    } else if (contentObj.isMp3) {
                        $contentWrap = $('<div class="content" data-seq="' + msg.seq + '" onclick="onChangePlayAudio(this)">');
                    }
                    if (!contentObj.isSys) {
                        $item.append(convertAvatarHtml(fromAccount, random));
                    }
                }

                break;
            case webim.MSG_ELEMENT_TYPE.GROUP_TIP:
                contentObj = convertGroupTipMsgToHtml(content);
                break;
            default:
                webim.Log.error('未知消息元素类型: elemType=' + type);
                break;
        }

        if (!contentObj) {
            continue;
        }
        //消息内容
        $contentWrap.append(contentObj.html);
        $contentWrap.addClass(contentObj.itemStyle);

        if (!contentObj.isSys) {
            $msgWrap.append(convertUserInfoToHtml(fromAccount));
        }
        $msgWrap.append($contentWrap);
        //chat-item
        $item.append($msgWrap);
        $item.addClass(contentObj.itemClass);

        html += $item[0].outerHTML;

    }

    return webim.Tool.formatHtml2Text(html);
}

/**
 * 转化历史消息
 * @param msglist
 */
function convertHistoryMsgtoHtml(msglist) {
    var isSend = true;//是否为自己发送
    var subType = webim.GROUP_MSG_SUB_TYPE.COMMON;
    if (!selSess) {
        selSess = new webim.Session(selType, selToID, selToID, selSessHeadUrl, Math.round(new Date().getTime() / 1000));
    }
    for (var i = 0; i < msglist.length; i++) {
        var msgItem = msglist[i];
        var random = msgItem.Random;
        var fromAccount = msgItem.From_Account;
        var fromAccountNick = vlive.studentList[fromAccount];
        var time = new Date().getTime();
        var seq = msgItem.seq;
        var msg = new webim.Msg(selSess, isSend, seq, random, time, fromAccount, subType, fromAccountNick);
        msg = covertHistoryMsgElem(msg, msgItem.MsgBody);
        msg.time = msgItem.time;
        showHistroyMsg(msg);
    }

}

function covertHistoryMsgElem(msg, msgBody) {
    var mb = msgBody[0];
    var type = mb.MsgType;
    switch (type) {
        case webim.MSG_ELEMENT_TYPE.IMAGE:
            //console.log("image");
            var images_obj = new webim.Msg.Elem.Images(mb.MsgContent.UUID);
            var iArr = mb.MsgContent.ImageInfoArray;
            for (var i = 0; i < 3; i++) {

                var newImg = new webim.Msg.Elem.Images.Image(iArr[i].Type, iArr[i].Size, iArr[i].Width, iArr[i].Height, iArr[i].URL);
                images_obj.addImage(newImg);
            }
            msg.addImage(images_obj);
            break;
        case webim.MSG_ELEMENT_TYPE.TEXT:
            //console.log("text");
            msg.addText(new webim.Msg.Elem.Text(mb.MsgContent.Text));
            break;
        case webim.MSG_ELEMENT_TYPE.CUSTOM:
            //console.log("custom");
            msg.addCustom(new webim.Msg.Elem.Custom(mb.MsgContent.Data, mb.MsgContent.Desc, mb.MsgContent.Ext));
            break;
        default:
            //console.log("default");
            break;
    }
    return msg;
}


//解析文本消息元素
function convertTextMsgToHtml(content) {
    return {
        html: deUnicode(content.getText()),
        itemStyle: 'bubble',
        itemClass: 'txt'
    };
}

//解析表情消息元素
function convertFaceMsgToHtml(content) {
    var faceUrl = null;
    var data = content.getData();
    var index = webim.EmotionDataIndexs[data];

    var emotion = webim.Emotions[index];
    if (emotion && emotion[1]) {
        faceUrl = emotion[1];
    }
    if (faceUrl) {
        return "<img src='" + faceUrl + "'/>";
    } else {
        return data;
    }
}

//解析图片消息元素
function convertImageMsgToHtml(content) {
    var smallImage = content.getImage(webim.IMAGE_TYPE.SMALL);//小图
    var bigImage = content.getImage(webim.IMAGE_TYPE.LARGE);//大图
    var oriImage = content.getImage(webim.IMAGE_TYPE.ORIGIN);//原图
    if (!bigImage) {
        bigImage = smallImage;
    }
    if (!oriImage) {
        oriImage = smallImage;
    }
    // html: "<img src='" + smallImage.getUrl() + "#" + bigImage.getUrl() + "#" + oriImage.getUrl() + "' style='CURSOR: hand' id='" + content.getImageId() + "' bigImgUrl='" + bigImage.getUrl() + "' onclick='imageClick(this)' />",
    var obj = {
        html: "<img src='" + oriImage.getUrl() + "' onclick='imageClick(this)' style='CURSOR: hand' id='" + content.getImageId() + "' bigImgUrl='" + bigImage.getUrl() + "' />",
        itemStyle: 'bubble',
        itemClass: 'img'
    };
    return obj;
}

//解析语音消息元素
function convertSoundMsgToHtml(content) {
    //音频图标+文字提示
    var tpl = '<div class="cricleplay"> <div class="small pani"></div> <div class="middle pani"></div> <div class="large pani"></div> </div> <span class="voice-tips">点击播放</span>';
    var second = content.getSecond();//获取语音时长
    var downUrl = content.getDownUrl();
    if (webim.BROWSER_INFO.type == 'ie' && parseInt(webim.BROWSER_INFO.ver) <= 8) {
        return '[这是一条语音消息]demo暂不支持ie8(含)以下浏览器播放语音,语音URL:' + downUrl;
    }
    var audio = '<audio src="' + downUrl + '" controls="controls" onplay="onChangePlayAudio(this)" preload="none"></audio>';
    var obj = {
        html: tpl + audio,
        itemStyle: 'bubble',
        itemClass: 'voice'
    }

    return obj;
}


//解析自定义消息元素
function convertCustomMsgToHtml(content, isExpire) {
    var data = content.getData();
    var desc = content.getDesc();
    var ext = content.getExt();
    if (ext == 'wxvoice') {
        //音频图标+文字提示
        var _data = JSON.parse(data);
        var tpl = '<div class="cricleplay"> <div class="small pani"></div> <div class="middle pani"></div> <div class="large pani"></div> </div>';
        var second = _data.second;//获取语音时长
        //http://vke-1252848614.costj.myqcloud.com/target/9I_ShdXPpe5g2a-BASo9_wN3BL6kha0nnIWlsndoq6x_tvIzdgNpds887EXepvQj4291432654265666811.mp3
        var audio = '';
        if (isExpire) {
            // _data.mediaId = "9I_ShdXPpe5g2a-BASo9_wN3BL6kha0nnIWlsndoq6x_tvIzdgNpds887EXepvQj4291432654265666811";
            // audio += '<audio src="http://vke-1252848614.costj.myqcloud.com/target/' + _data.mediaId + '.mp3" controls="controls" onplay="onChangePlayAudio(this)" preload="none"></audio>';
            audio += '<audio src="http://vke-1252848614.costj.myqcloud.com/target/' + _data.mediaId + '.mp3" controls="controls" onplay="onChangePlayAudio(this)" preload="none"></audio>';
        }
        audio += '<span data-sid="' + _data.mediaId + '" data-lid="' + _data.localId + '" data-second="' + second + '" class="audio-tips">点击播放</span>';
        var audio_ext = '<span class="voice_ext"><span class="second">' + second + '</span><span style="margin-left: -2px">"</span><span class="play_flag"></span></span>'
        var obj = {
            html: tpl + audio + audio_ext,
            itemStyle: 'bubble',
            itemClass: 'voice',
            isVoice: true,  //是否是微信语音
            isSys: false //是否是系统消息
        };

        if (isExpire) {
            obj.isMp3 = true;
            obj.isVoice = false;
        }

        return obj;
    } else if (ext == 'towall') {
        var _data = JSON.parse(data);
        var _chtml = '<p><span>' + deUnicode(_data.uname) + ':</span><span class="replay">' + deUnicode(_data.content) + '</span></p>';
        var _remarkHtml = '';
        if (_data.remark) {
            _remarkHtml = '<p><span>回复:</span><span class="replay">' + deUnicode(_data.remark) + '</span></p>';
        }
        return {
            html: _chtml + _remarkHtml,
            itemStyle: 'bubble',
            itemClass: 'txt',
            isVoice: false,
            isSys: false
        };
    } else if (ext == 'msgRedpacket') {
        var _data = JSON.parse(data);
        var toUInfo = vlive.studentList[_data.toUid];
        var fromUInfo = vlive.studentList[_data.fromUid];
        var _chtml = '<span class="diamond"></span><span class="txt">' + fromUInfo.nickname + '赞赏了' + toUInfo.nickname + '一个</span><span class="money">' + _data.money + '元红包</span>';
        return {
            html: _chtml,
            itemStyle: '',
            itemClass: 'rp',
            isVoice: false,
            isSys: true
        };

    } else if (ext == 'sys:banned') {
        var _data = JSON.parse(data);
        vlive.onBannedMsg(_data);
    } else {
        return 0;
    }
}
/**
 * 根据uid转换用户信息字符串
 * @param uid
 * @returns {string}
 */
function toUserInfoStr(uid) {
    var uinfo = vlive.studentList[uid];

    var typeStr = '';
    switch (uinfo.type) {
        case 'lecturer':
            typeStr = '【讲师】';
            break;
        case 'course_interact':
            typeStr = '【互动学员】';
            break;
        case 'course_audit':
            typeStr = '【旁听学员】';
            break;
    }
    return typeStr + " " + uinfo.nickname + " ";
}
/**
 * 转换用户信息为 html
 * @param uid
 * @returns {string}
 */
function convertUserInfoToHtml(uid) {
    if (!uid || uid.indexOf('@TIM#') >= 0) {
        return "";
    }
    var uinfo = vlive.studentList[uid];
    var typeStr = '';
    switch (uinfo.type) {
        case 'lecturer':
            typeStr = '【讲师】';
            break;
        case 'course_interact':
            typeStr = '【互动学员】';
            break;
        case 'course_audit':
            typeStr = '【旁听学员】';
            break;
    }
    var tpl = '<div data-uid="#uid#" class="placeholder">#nickname#&nbsp;|&nbsp;#type#</div>';
    tpl = tpl.replace(/#nickname#/, uinfo.nickname).replace(/#type#/, typeStr).replace(/#uid#/, uid);
    return tpl;
}

//解析群提示消息元素
function convertGroupTipMsgToHtml(content) {
    var WEB_IM_GROUP_TIP_MAX_USER_COUNT = 10;
    var text = "";
    var maxIndex = WEB_IM_GROUP_TIP_MAX_USER_COUNT - 1;
    var opType, opUserId, userIdList;
    var memberCount;
    opType = content.getOpType();//群提示消息类型（操作类型）
    opUserId = content.getOpUserId();//操作人id
    switch (opType) {
        case webim.GROUP_TIP_TYPE.JOIN://加入群
            userIdList = content.getUserIdList();
            //text += opUserId + "邀请了";
            //console.log(userIdList);
            for (var m in userIdList) {
                text += toUserInfoStr(userIdList[m]) + ",";
                if (userIdList.length > WEB_IM_GROUP_TIP_MAX_USER_COUNT && m == maxIndex) {
                    text += "等" + userIdList.length + "人";
                    break;
                }
            }
            text = text.substring(0, text.length - 1);
            text += "进入课堂";
            //房间成员数加1
            memberCount = $('#user-icon-fans').html();
            $('#user-icon-fans').html(parseInt(memberCount) + 1);
            break;
        case webim.GROUP_TIP_TYPE.QUIT://退出群
            text += opUserId + "离开课堂";
            //房间成员数减1
            memberCount = parseInt($('#user-icon-fans').html());
            if (memberCount > 0) {
                $('#user-icon-fans').html(memberCount - 1);
            }
            break;
        case webim.GROUP_TIP_TYPE.KICK://踢出群
            text += opUserId + "将";
            userIdList = content.getUserIdList();
            for (var m in userIdList) {
                text += userIdList[m] + ",";
                if (userIdList.length > WEB_IM_GROUP_TIP_MAX_USER_COUNT && m == maxIndex) {
                    text += "等" + userIdList.length + "人";
                    break;
                }
            }
            text += "踢出该课堂";
            break;
        case webim.GROUP_TIP_TYPE.SET_ADMIN://设置管理员
            text += opUserId + "将";
            userIdList = content.getUserIdList();
            for (var m in userIdList) {
                text += userIdList[m] + ",";
                if (userIdList.length > WEB_IM_GROUP_TIP_MAX_USER_COUNT && m == maxIndex) {
                    text += "等" + userIdList.length + "人";
                    break;
                }
            }
            text += "设为管理员";
            break;
        case webim.GROUP_TIP_TYPE.CANCEL_ADMIN://取消管理员
            text += opUserId + "取消";
            userIdList = content.getUserIdList();
            for (var m in userIdList) {
                text += userIdList[m] + ",";
                if (userIdList.length > WEB_IM_GROUP_TIP_MAX_USER_COUNT && m == maxIndex) {
                    text += "等" + userIdList.length + "人";
                    break;
                }
            }
            text += "的管理员资格";
            break;

        case webim.GROUP_TIP_TYPE.MODIFY_GROUP_INFO://群资料变更
            text += opUserId + "修改了课堂料：";
            var groupInfoList = content.getGroupInfoList();
            var type, value;
            for (var m in groupInfoList) {
                type = groupInfoList[m].getType();
                value = groupInfoList[m].getValue();
                switch (type) {
                    case webim.GROUP_TIP_MODIFY_GROUP_INFO_TYPE.FACE_URL:
                        text += "群头像为" + value + "; ";
                        break;
                    case webim.GROUP_TIP_MODIFY_GROUP_INFO_TYPE.NAME:
                        text += "群名称为" + value + "; ";
                        break;
                    case webim.GROUP_TIP_MODIFY_GROUP_INFO_TYPE.OWNER:
                        text += "群主为" + value + "; ";
                        break;
                    case webim.GROUP_TIP_MODIFY_GROUP_INFO_TYPE.NOTIFICATION:
                        text += "群公告为" + value + "; ";
                        break;
                    case webim.GROUP_TIP_MODIFY_GROUP_INFO_TYPE.INTRODUCTION:
                        text += "群简介为" + value + "; ";
                        break;
                    default:
                        text += "未知信息为:type=" + type + ",value=" + value + "; ";
                        break;
                }
            }
            break;

        case webim.GROUP_TIP_TYPE.MODIFY_MEMBER_INFO://群成员资料变更(禁言时间)
            text += opUserId + "修改了群成员资料:";
            var memberInfoList = content.getMemberInfoList();
            var userId, shutupTime;
            for (var m in memberInfoList) {
                userId = memberInfoList[m].getUserId();
                shutupTime = memberInfoList[m].getShutupTime();
                text += userId + ": ";
                if (shutupTime != null && shutupTime !== undefined) {
                    if (shutupTime == 0) {
                        text += "取消禁言; ";
                    } else {
                        text += "禁言" + shutupTime + "秒; ";
                    }
                } else {
                    text += " shutupTime为空";
                }
                if (memberInfoList.length > WEB_IM_GROUP_TIP_MAX_USER_COUNT && m == maxIndex) {
                    text += "等" + memberInfoList.length + "人";
                    break;
                }
            }
            break;
        default:
            text += "未知群提示消息类型：type=" + opType;
            break;
    }

    return {
        html: text,
        itemStyle: '',
        itemClass: 'sys'
    };
}

//tls登录
function tlsLogin() {
    //跳转到TLS登录页面
    TLSHelper.goLogin({
        sdkappid: loginInfo.sdkAppID,
        acctype: loginInfo.accountType,
        url: window.location.href
    });
}

//第三方应用需要实现这个函数，并在这里拿到UserSig
function tlsGetUserSig(res) {
    //成功拿到凭证
    if (res.ErrorCode == webim.TLS_ERROR_CODE.OK) {
        //从当前URL中获取参数为identifier的值
        loginInfo.identifier = webim.Tool.getQueryString("identifier");
        //拿到正式身份凭证
        loginInfo.userSig = res.UserSig;
        //从当前URL中获取参数为sdkappid的值
        loginInfo.sdkAppID = loginInfo.appIDAt3rd = Number(webim.Tool.getQueryString("sdkappid"));
        //从cookie获取accountType
        var accountType = webim.Tool.getCookie('accountType');
        if (accountType) {
            loginInfo.accountType = accountType;
            sdkLogin();//sdk登录
        } else {
            location.href = location.href.replace(/\?.*$/gi, "");
        }
    } else {
        //签名过期，需要重新登录
        if (res.ErrorCode == webim.TLS_ERROR_CODE.SIGNATURE_EXPIRATION) {
            tlsLogin();
        } else {
            alert("[" + res.ErrorCode + "]" + res.ErrorInfo);
        }
    }
}

//单击图片事件
function imageClick(imgObj) {
    var imgUrls = imgObj.src;
    var imgUrlArr = imgUrls.split("#"); //字符分割
    var smallImgUrl = imgUrlArr[0];//小图
    var bigImgUrl = imgUrlArr[1];//大图
    var oriImgUrl = imgUrlArr[2];//原图
    vlive.openPhotoBrowser(smallImgUrl);
    webim.Log.info("小图url:" + smallImgUrl);
    webim.Log.info("大图url:" + bigImgUrl);
    webim.Log.info("原图url:" + oriImgUrl);
}


//切换播放audio对象
function onChangePlayAudio(obj) {
    var audio = $(obj).find('audio')[0];
    if (audio) {
        //监听播放结束
        audio.addEventListener("ended", function() {
            $(curPlayAudio).removeClass("playing");
            var obj = $(curPlayAudio).next(".voice");
            if (obj.length) {
                onChangePlayAudio(obj.find(".content")[0]);
            }
        }, false)

        var cpv = $(obj);
        cpv.addClass("playing");
        audio.play();
        cpv.find(".play_flag").remove();
        if (curPlayAudio) {//如果正在播放语音
            if (curPlayAudio != obj) {//要播放的语音跟当前播放的语音不一样
                curPlayAudio.currentTime = 0;
                var audioo = $(curPlayAudio).find('audio')[0];
                audioo.pause();
                $(curPlayAudio).find(".play_flag").remove();
                curPlayAudio = obj;
            }
        } else {
            curPlayAudio = obj;//记录当前播放的语音
        }
    }
}

function getWxVoiceId(obj) {
    var _oo = $(obj).find(".audio-tips");
    var sid = _oo.data("sid");
    var localId = $(document).data(sid);
    return {
        sid: sid,
        lid: localId
    }
}


function wxVoiceStop(localId) {
    wx.stopVoice({
        localId: localId // 需要停止的音频的本地ID，由stopRecord接口获得
    });
    //切换状态:
    var cpv = curPlayVoice;
    cpv.removeClass("playing");
    curPlayVoice = null;
}

var currVoiceLocalId = null;
function wxVoicePlay(idInfo) {
    //是否存储微信语音的localId;
    if (idInfo.lid) {
        //缓存
        $(document).data(idInfo.sid, idInfo.lid);
        var cpv = $(curPlayVoice);
        cpv.addClass("playing");
        currVoiceLocalId = idInfo.lid;
        cpv.find(".play_flag").remove();
        wx.playVoice({
            localId: idInfo.lid // 需要播放的音频的本地ID，由stopRecord接口获得
        });
    } else {
        wxVoiceDownload(idInfo.sid);
    }
}

function wxVoiceDownload(id) {
    wx.downloadVoice({
        serverId: id, // 需要下载的音频的服务器端ID，由uploadVoice接口获得
        isShowProgressTips: 0, // 默认为1，显示进度提示
        success: function (res) {
            var localId = res.localId; // 返回音频的本地ID
            //下载成功后播放
            wxVoicePlay({sid: id, lid: localId});
        }
    });
}

function onWxVoicePlay(obj) {
    obj = $(obj).parent().parent();
    console.log(obj.data('random'));
    if (curPlayVoice) {//如果正在播放语音
        var curSeq = curPlayVoice.data("random");
        var seq = obj.data("random");
        console.log(curPlayVoice);
        console.log(obj);
        console.log(curSeq + "|" + seq + "::" + ( curSeq !== seq))
        if (curSeq !== seq) {//要播放的语音跟当前播放的语音不一样
            curPlayVoice = obj;
        } else {
            //停止播放
            wxVoiceStop(currVoiceLocalId);
            return false;
        }
    } else {
        curPlayVoice = obj;//记录当前播放的语音
    }

    // curPlayVoice.currentTime = 0;
    // curPlayVoice.pause();
    //暂停播放当前语音，开始播放新的语音
    var idInfo = getWxVoiceId(curPlayVoice);
    wxVoicePlay(idInfo);
}

/**
 * 检查用户登录
 * @returns {boolean}
 */
function checkLogin() {
    if (!loginInfo.identifier) {//未登录
        if (accountMode == 1) {//托管模式
            //将account_type保存到cookie中,有效期是1天
            webim.Tool.setCookie('accountType', loginInfo.accountType, 3600 * 24);
            //调用tls登录服务
            tlsLogin();
        } else {//独立模式
            $.totast('配置失败', 'text');
        }
        return false;
    }

    if (!selToID) {
        $.toast("您还没有进入课堂，暂不能聊天", 'text');
        $("#send_msg_text").val('');
        return false;
    } else {
        return true;
    }
}


/**
 * 发送文本消息(普通消息)
 * @param msgtosend
 */
function sendTxtMsg(msgtosend) {
    if (!checkLogin()) {
        return;
    }

    //转 Unicode  解决乱码问题
    msgtosend = enUnicode(msgtosend);
    var msgLen = webim.Tool.getStrBytes(msgtosend);

    if (msgtosend.length < 1) {
        alert("发送的消息不能为空!");
        return;
    }

    var maxLen, errInfo;
    if (selType == webim.SESSION_TYPE.GROUP) {
        maxLen = webim.MSG_MAX_LENGTH.GROUP;
        errInfo = "消息长度超出限制(最多" + Math.round(maxLen / 3) + "汉字)";
    } else {
        maxLen = webim.MSG_MAX_LENGTH.C2C;
        errInfo = "消息长度超出限制(最多" + Math.round(maxLen / 3) + "汉字)";
    }
    if (msgLen > maxLen) {
        alert(errInfo);
        return;
    }

    if (!selSess) {
        selSess = new webim.Session(selType, selToID, selToID, selSessHeadUrl, Math.round(new Date().getTime() / 1000));
    }
    var isSend = true;//是否为自己发送
    var seq = -1;//消息序列，-1表示sdk自动生成，用于去重
    var random = getMsgRandom(loginInfo.identifier);//消息随机数，用于去重
    var msgTime = Math.round(new Date().getTime() / 1000);//消息时间戳
    var subType;//消息子类型
    if (selType == webim.SESSION_TYPE.GROUP) {
        //群消息子类型如下：
        //webim.GROUP_MSG_SUB_TYPE.COMMON-普通消息,
        //webim.GROUP_MSG_SUB_TYPE.LOVEMSG-点赞消息，优先级最低
        //webim.GROUP_MSG_SUB_TYPE.TIP-提示消息(不支持发送，用于区分群消息子类型)，
        //webim.GROUP_MSG_SUB_TYPE.REDPACKET-红包消息，优先级最高
        subType = webim.GROUP_MSG_SUB_TYPE.COMMON;

    } else {
        //C2C消息子类型如下：
        //webim.C2C_MSG_SUB_TYPE.COMMON-普通消息,
        subType = webim.C2C_MSG_SUB_TYPE.COMMON;
    }
    var msg = new webim.Msg(selSess, isSend, seq, random, msgTime, loginInfo.identifier, subType, loginInfo.identifierNick);
    //解析文本和表情
    var expr = /\[[^[\]]{1,3}\]/mg;
    var emotions = msgtosend.match(expr);
    var text_obj, face_obj, tmsg, emotionIndex, emotion, restMsgIndex;
    if (!emotions || emotions.length < 1) {
        text_obj = new webim.Msg.Elem.Text(msgtosend);
        msg.addText(text_obj);
    } else {//有表情

        for (var i = 0; i < emotions.length; i++) {
            tmsg = msgtosend.substring(0, msgtosend.indexOf(emotions[i]));
            if (tmsg) {
                text_obj = new webim.Msg.Elem.Text(tmsg);
                msg.addText(text_obj);
            }
            emotionIndex = webim.EmotionDataIndexs[emotions[i]];
            emotion = webim.Emotions[emotionIndex];
            if (emotion) {
                face_obj = new webim.Msg.Elem.Face(emotionIndex, emotions[i]);
                msg.addFace(face_obj);
            } else {
                text_obj = new webim.Msg.Elem.Text(emotions[i]);
                msg.addText(text_obj);
            }
            restMsgIndex = msgtosend.indexOf(emotions[i]) + emotions[i].length;
            msgtosend = msgtosend.substring(restMsgIndex);
        }
        if (msgtosend) {
            text_obj = new webim.Msg.Elem.Text(msgtosend);
            msg.addText(text_obj);
        }
    }
    webim.sendMsg(msg, function (resp) {
        if (selType == webim.SESSION_TYPE.C2C) {//私聊时，在聊天窗口手动添加一条发的消息，群聊时，长轮询接口会返回自己发的消息
            showMsg(msg);
        }
        webim.Log.info("发消息成功");
        // hideDiscussForm();//隐藏评论表单
        // showDiscussTool();//显示评论工具栏
        // hideDiscussEmotion();//隐藏表情
    }, function (err) {
        webim.Log.error("发消息失败:" + err.ErrorInfo);
        $.toast("发消息失败:" + err.ErrorInfo, 'text');
    });
}
/**
 * 发送图片消息
 * @param images
 */
function sendImageMsg(images) {
    if (!checkLogin()) {
        return;
    }


    if (!selSess) {
        selSess = new webim.Session(selType, selToID, selToID, selSessHeadUrl, Math.round(new Date().getTime() / 1000));
    }
    var isSend = true;//是否为自己发送
    var seq = -1;//消息序列，-1表示sdk自动生成，用于去重
    var random = getMsgRandom(loginInfo.identifier);//消息随机数，用于去重
    var msgTime = Math.round(new Date().getTime() / 1000);//消息时间戳
    var subType;//消息子类型
    if (selType == webim.SESSION_TYPE.GROUP) {
        //群消息子类型如下：
        //webim.GROUP_MSG_SUB_TYPE.COMMON-普通消息,
        //webim.GROUP_MSG_SUB_TYPE.LOVEMSG-点赞消息，优先级最低
        //webim.GROUP_MSG_SUB_TYPE.TIP-提示消息(不支持发送，用于区分群消息子类型)，
        //webim.GROUP_MSG_SUB_TYPE.REDPACKET-红包消息，优先级最高
        subType = webim.GROUP_MSG_SUB_TYPE.COMMON;

    } else {
        //C2C消息子类型如下：
        //webim.C2C_MSG_SUB_TYPE.COMMON-普通消息,
        subType = webim.C2C_MSG_SUB_TYPE.COMMON;
    }
    var msg = new webim.Msg(selSess, isSend, seq, random, msgTime, loginInfo.identifier, subType, loginInfo.identifierNick);
    var images_obj = new webim.Msg.Elem.Images(images.id);
    var newImg = new webim.Msg.Elem.Images.Image(1, images.size, images.width, images.height, images.download_url);
    images_obj.addImage(newImg);
    msg.addImage(images_obj);
    //调用发送图片接口
    webim.sendMsg(msg, function (resp) {
        if (selType == webim.SESSION_TYPE.C2C) {//私聊时，在聊天窗口手动添加一条发的消息，群聊时，长轮询接口会返回自己发的消息
            showMsg(msg);
        }
        webim.Log.info("发消息成功");
        // hideDiscussForm();//隐藏评论表单
        // showDiscussTool();//显示评论工具栏
        // hideDiscussEmotion();//隐藏表情
    }, function (err) {
        webim.Log.error("发消息失败:" + err.ErrorInfo);
        $.toast("发消息失败:" + err.ErrorInfo, 'text');
    });

}


function sendVoiceMsg(voiceId, localId, second) {

    if (!checkLogin()) {
        return;
    }
    if (!voiceId) {
        $.toast("音频文件不能为空!", 'text');
        return;
    }

    if (!selSess) {
        selSess = new webim.Session(selType, selToID, selToID, selSessHeadUrl, getMsgRandom(loginInfo.identifier));
    }
    var msg = new webim.Msg(selSess, true, -1, -1, -1, loginInfo.identifier, 0, loginInfo.identifierNick);
    var ext = "wxvoice"
    var data = JSON.stringify({
        type: 'voice',
        mediaId: voiceId,
        localId: localId,
        second: second
    });
    var desc = "wxvoice";
    var custom_obj = new webim.Msg.Elem.Custom(data, desc, ext);
    msg.addCustom(custom_obj);
    //调用发送消息接口
    webim.sendMsg(msg, function (resp) {
        if (selType == webim.SESSION_TYPE.C2C) {//私聊时，在聊天窗口手动添加一条发的消息，群聊时，长轮询接口会返回自己发的消息
            addMsg(msg);
        }
        // $('#edit_custom_msg_dialog').modal('hide');
        //缓存下id
        $(document).data(voiceId, localId);
    }, function (err) {
        alert(err.ErrorInfo);
    });
}

function sendToWallMsg(json) {

    if (!checkLogin()) {
        return;
    }

    if (!selSess) {
        selSess = new webim.Session(selType, selToID, selToID, selSessHeadUrl, getMsgRandom(loginInfo.identifier));
    }
    var msg = new webim.Msg(selSess, true, -1, -1, -1, loginInfo.identifier, 0, loginInfo.identifierNick);
    var ext = "towall"
    json.type = ext;
    var data = JSON.stringify(json);
    var desc = "towall";
    var custom_obj = new webim.Msg.Elem.Custom(data, desc, ext);
    msg.addCustom(custom_obj);
    //调用发送消息接口
    webim.sendMsg(msg, function (resp) {
        if (selType == webim.SESSION_TYPE.C2C) {//私聊时，在聊天窗口手动添加一条发的消息，群聊时，长轮询接口会返回自己发的消息
            addMsg(msg);
        }
    }, function (err) {
        alert(err.ErrorInfo);
    });
}

function sendToMsgRedpacketMsg(json) {

    if (!checkLogin()) {
        return;
    }
    if (!selSess) {
        selSess = new webim.Session(selType, selToID, selToID, selSessHeadUrl, getMsgRandom(loginInfo.identifier));
    }
    var msg = new webim.Msg(selSess, true, -1, -1, -1, loginInfo.identifier, 0, loginInfo.identifierNick);
    var ext = "msgRedpacket"
    json.type = ext;
    var data = JSON.stringify(json);
    var desc = "msgRedpacket";
    var custom_obj = new webim.Msg.Elem.Custom(data, desc, ext);
    msg.addCustom(custom_obj);
    //调用发送消息接口
    webim.sendMsg(msg, function (resp) {
        if (selType == webim.SESSION_TYPE.C2C) {//私聊时，在聊天窗口手动添加一条发的消息，群聊时，长轮询接口会返回自己发的消息
            addMsg(msg);
        }
    }, function (err) {
        alert(err.ErrorInfo);
    });
}

function sendBannedMsg(json) {

    if (!checkLogin()) {
        return;
    }

    if (!selSess) {
        selSess = new webim.Session(selType, selToID, selToID, selSessHeadUrl, getMsgRandom(loginInfo.identifier));
    }
    var msg = new webim.Msg(selSess, true, -1, -1, -1, loginInfo.identifier, 0, loginInfo.identifierNick);
    var ext = "sys:banned"
    json.btype = json.type;
    json.type = ext;
    var data = JSON.stringify(json);
    var desc = "sys:banned";
    var custom_obj = new webim.Msg.Elem.Custom(data, desc, ext);
    msg.addCustom(custom_obj);
    //调用发送消息接口
    webim.sendMsg(msg, function (resp) {
        if (selType == webim.SESSION_TYPE.C2C) {//私聊时，在聊天窗口手动添加一条发的消息，群聊时，长轮询接口会返回自己发的消息
            addMsg(msg);
        }
    }, function (err) {
        alert(err.ErrorInfo);
    });
}

function sendCustomMsg(data, desc, ext) {
    if (!checkLogin()) {
        return;
    }

    var msgLen = webim.Tool.getStrBytes(data);

    if (data.length < 1) {
        alert("发送的消息不能为空!");
        return;
    }
    var maxLen, errInfo;
    if (selType == webim.SESSION_TYPE.C2C) {
        maxLen = webim.MSG_MAX_LENGTH.C2C;
        errInfo = "消息长度超出限制(最多" + Math.round(maxLen / 3) + "汉字)";
    } else {
        maxLen = webim.MSG_MAX_LENGTH.GROUP;
        errInfo = "消息长度超出限制(最多" + Math.round(maxLen / 3) + "汉字)";
    }
    if (msgLen > maxLen) {
        $.toast(errInfo, 'text');
        return;
    }

    if (!selSess) {
        selSess = new webim.Session(selType, selToID, selToID, selSessHeadUrl, Math.round(new Date().getTime() / 1000));
    }
    var msg = new webim.Msg(selSess, true, -1, -1, -1, loginInfo.identifier, 0, loginInfo.identifierNick);
    var custom_obj = new webim.Msg.Elem.Custom(data, desc, ext);
    msg.addCustom(custom_obj);
    //调用发送消息接口
    webim.sendMsg(msg, function (resp) {
        if (selType == webim.SESSION_TYPE.C2C) {//私聊时，在聊天窗口手动添加一条发的消息，群聊时，长轮询接口会返回自己发的消息
            addMsg(msg);
        }
        // $('#edit_custom_msg_dialog').modal('hide');
    }, function (err) {
        alert(err.ErrorInfo);
    });
}

//发送消息(群点赞消息)
function sendGroupLoveMsg() {
    if (!checkLogin()) {
        return;
    }

    if (!selSess) {
        selSess = new webim.Session(selType, selToID, selToID, selSessHeadUrl, Math.round(new Date().getTime() / 1000));
    }
    var isSend = true;//是否为自己发送
    var seq = -1;//消息序列，-1表示sdk自动生成，用于去重
    var random = Math.round(Math.random() * 4294967296);//消息随机数，用于去重
    var msgTime = Math.round(new Date().getTime() / 1000);//消息时间戳
    //群消息子类型如下：
    //webim.GROUP_MSG_SUB_TYPE.COMMON-普通消息,
    //webim.GROUP_MSG_SUB_TYPE.LOVEMSG-点赞消息，优先级最低
    //webim.GROUP_MSG_SUB_TYPE.TIP-提示消息(不支持发送，用于区分群消息子类型)，
    //webim.GROUP_MSG_SUB_TYPE.REDPACKET-红包消息，优先级最高
    var subType = webim.GROUP_MSG_SUB_TYPE.LOVEMSG;

    var msg = new webim.Msg(selSess, isSend, seq, random, msgTime, loginInfo.identifier, subType, loginInfo.identifierNick);
    var msgtosend = 'love_msg';
    var text_obj = new webim.Msg.Elem.Text(msgtosend);
    msg.addText(text_obj);

    webim.sendMsg(msg, function (resp) {
        if (selType == webim.SESSION_TYPE.C2C) {//私聊时，在聊天窗口手动添加一条发的消息，群聊时，长轮询接口会返回自己发的消息
            showMsg(msg);
        }
        webim.Log.info("点赞成功");
    }, function (err) {
        webim.Log.error("发送点赞消息失败:" + err.ErrorInfo);
        $.toast("发送点赞消息失败:" + err.ErrorInfo, 'text');
    });
}

//隐藏表情框
function hideDiscussEmotion() {
    $(".video-discuss-emotion").hide();
    //$(".video-discuss-emotion").fadeOut("slow");
}

//显示表情框
function showDiscussEmotion() {
    $(".video-discuss-emotion").show();
    //$(".video-discuss-emotion").fadeIn("slow");

}

//展示点赞动画
function showLoveMsgAnimation() {
    //点赞数加1
    var loveCount = $('#user-icon-like').html();
    $('#user-icon-like').html(parseInt(loveCount) + 1);
    var toolDiv = document.getElementById("video-discuss-tool");
    var loveSpan = document.createElement("span");
    var colorList = ['red', 'green', 'blue'];
    var max = colorList.length - 1;
    var min = 0;
    var index = parseInt(Math.random() * (max - min + 1) + min, max + 1);
    var color = colorList[index];
    loveSpan.setAttribute('class', 'like-icon zoomIn ' + color);
    toolDiv.appendChild(loveSpan);
}

//初始化表情
function initEmotionUL() {
    for (var index in webim.Emotions) {
        var emotions = $('<img>').attr({
            "id": webim.Emotions[index][0],
            "src": webim.Emotions[index][1],
            "style": "cursor:pointer;"
        }).click(function () {
            selectEmotionImg(this);
        });
        $('<li>').append(emotions).appendTo($('#emotionUL'));
    }
}

//打开或显示表情
function showEmotionDialog() {
    if (openEmotionFlag) {//如果已经打开
        openEmotionFlag = false;
        hideDiscussEmotion();//关闭
    } else {//如果未打开
        openEmotionFlag = true;
        showDiscussEmotion();//打开
    }
}

//选中表情
function selectEmotionImg(selImg) {
    $("#send_msg_text").val($("#send_msg_text").val() + selImg.id);
}

//退出大群
function quitBigGroup() {
    var options = {
        'GroupId': avChatRoomId//群id
    };
    webim.quitBigGroup(
        options,
        function (resp) {

            webim.Log.info('退群成功');
            $("#video_sms_list").find("li").remove();
            //webim.Log.error('进入另一个大群:'+avChatRoomId2);
            //applyJoinBigGroup(avChatRoomId2);//加入大群
        },
        function (err) {
            alert(err.ErrorInfo);
        }
    );
}

//登出
function logout() {
    //登出
    webim.logout(
        function (resp) {
            webim.Log.info('登出成功');
            loginInfo.identifier = null;
            loginInfo.userSig = null;
            $("#video_sms_list").find("li").remove();
            var indexUrl = window.location.href;
            var pos = indexUrl.indexOf('?');
            if (pos >= 0) {
                indexUrl = indexUrl.substring(0, pos);
            }
            window.location.href = indexUrl;
        }
    );
}
