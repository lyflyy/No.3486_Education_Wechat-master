/**
 * 直播交互js
 *
 * Created by hz on 2016/12/18.
 */


;var api = {
    prefix: '/api',
    collect: function (courseId) {
        return "/api/course/" + courseId + "/collect";
    },
    liveFinish: function (liveId) {
        return api.prefix + '/live/' + liveId + '/finish';
    }
};

/**
 * 直播对象
 */
;
var Vlive = function () {
    // Hammer.defaults.domEvents = true;
    this.init();
};

Vlive.prototype = {
    /**
     * 直播对象初始化
     */
    init: function () {
        var _this = this;
        _this.fixPressEvent();
        _this.initData();
        _this.initStudent();
        _this.initLive();//初始化直播
        _this.initWx(); //初始化微信排至
        _this.initEvent();
        _this.initForumMod();
        _this.initMaterialMod();
        _this.initImgUpload();

    },
    initData: function () {
        var _this = this;
        this.cancelRecordVoice = false;
        this.loginInfo = $("#loginInfo").val();
        this.courseId = $("#courseId").val();
        this.liveId = $("#liveId").val();
        this.historyMsgCount = 0;
        this.lecturerId = $("#lecturerId").val();
        this.isDisableForum = $('#isDisableForum').val();
        this.isDisableInteract = $('#isDisableInteract').val();
        this.isLecturer = $('#isLecturer').val();
        this.baseUrl = "/api/course/" + this.courseId;
        this.chatBar = $("#chat-ft");
        this.courseStatus = $("#course-status").val();
        // this.msgTextInput;
        this.bannedInfo = {};
        this.user = {
            userId: $("#userId").val(),
            isbf: $("#data-isbf").val() === "true",
            isbl: $("#data-isbl").val() === "true",
            disableForum: 0,
            disableInteract: 0
        }
    },
    /**
     * 初始化直播
     */
    initLive: function () {
        var _this = this;
        _this.openPhotoBrowser = function (currentImg) {
            var imglist = $('#chat-list .chat_item.img .msg img');
            var option = {
                items: [],
                initIndex: 0
            };

            var _t = this;
            $.each(imglist, function (index, obj) {
                var src = obj.src;
                option.items.push(src);
                if (currentImg === src) {
                    option.initIndex = index;
                }
            })
            if (_this.photoBrowser) {
                _this.photoBrowser.modal.remove();
                _this.photoBrowser = null;
            }
            _this.photoBrowser = $.photoBrowser(option);
            _this.photoBrowser.open();
        };

        var historyParam = {
            liveId: _this.liveId,
            pageIndex: 0
        };
        var xhr = null;
        // var loading = false;
        var lastPageIndex = undefined;
        var live = {
            isScroll: true,
            hasHistoryMsg: true,

            /**
             *
             * 加载历史消息
             * @param data
             */
            loadHistoryMsg: function (param) {
                // console.log("-----:loadHistoryMsg");
                // console.log(param);
                if (lastPageIndex === param.pageIndex || !live.hasHistoryMsg) {
                    return;
                }
                // loading = true;
                lastPageIndex = param.pageIndex;
                $.showLoading("加载中...")
                xhr = $.get("/api/live/" + _this.liveId + "/msgList", param, function (res) {
                    if (res.success) {
                        convertHistoryMsgtoHtml(res.data.list);
                        // live.isScroll = false;
                        // historyParam.pageIndex += 1;
                        // live.hasHistoryMsg = res.data.isMore;
                        //如果没有更多历史消息就销毁滚动加载
                        // if (live.hasHistoryMsg) {
                        //     console.log("hasHistory:" + live.hasHistoryMsg);
                        //     live.loadHistoryMsg(historyParam);
                        // }
                        $("#historyMsgCount").hide();
                        $.hideLoading();
                    } else {
                        $.toast('消息列表加载出错!', 'text');
                    }
                    // loading = false;
                    lastPageIndex = 0;
                });
            },

            /**
             * 初始化 直播
             * @param loginInfo
             * @private
             */
            initLive: function () {

                $.post("/api/live/" + _this.liveId + "/sign", {courseId: _this.courseId}, function (res) {
                    if (res.success) {
                        //console.log(res);
                        var liveSign = res.data;
                        sdkAppID = liveSign.sdkAppID;
                        accountType = liveSign.accountType;
                        avChatRoomId = liveSign.liveId + "";
                        selToID = avChatRoomId;
                        loginInfo = liveSign;
                        currentMsgSeq = liveSign.maxSeq;
                        _this.bannedInfo = liveSign.bInfo;
                        _this.historyMsgCount = liveSign.msgCount;
                        var farr = liveSign.bInfo.forum;
                        var iarr = liveSign.bInfo.interact;
                        for (var i = 0; i < farr.length; i++) {
                            if (farr[i] == _this.user.userId) {
                                _this.user.disableForum = '1';
                                break;
                            }
                        }

                        for (var j = 0; i < iarr.length; j++) {
                            if (iarr[j] == _this.user.userId) {
                                _this.user.disableInteract = '1';
                                break;
                            }
                        }
                        //加载历史消息
                        // live.loadHistoryMsg(historyParam);
                        //加载完历史消息在做 sdk登录
                        sdkLogin(loginInfo, listeners, options);
                        if (_this.courseStatus!=3){
                            if (_this.historyMsgCount > 0) {
                                $("#historyMsgCount").show().find(".money").text(_this.historyMsgCount);
                            }
                        } else {//如果课程已结束，拉所有消息
                            historyParam.index = _this.historyMsgCount;
                            live.loadHistoryMsg(historyParam)
                        }
                    } else {
                        $.toast('直播签名错误', 'text');
                    }
                });
            }
        };

        live.initLive();

        $("#historyMsgCount").on("click",function(){
            historyParam.index = _this.historyMsgCount;
            live.loadHistoryMsg(historyParam)
        })
        // $('#live-page').infinite(100).on("infinite", function () {
        //     if (!_this.hasHistoryMsg) return;
        //
        //     if (live.isScroll) return;
        //     //console.log("start loading more");
        //     live.isScroll = true;
        //     // setTimeout(function () {
        //     // historyParam.pageIndex += 1;
        //     live.loadHistoryMsg(historyParam);
        // });


    },
    initWx: function () {
        var _this = this;

        var initSahre = function () {
            //加载分享数据
            $.post("/wx/view/course/share/" + _this.courseId, {}, function (data) {
                if (data.success) {
                    var param = $.parseJSON(data.data);
                    param.imgUrl = 'http://vke2016-10071423.image.myqcloud.com/' + param.imgUrl + "?imageView2/1/w/300/h/300";
                    window.shareData = param;
                    wx.onMenuShareTimeline({
                        title: shareData.title, // 分享标题param.title
                        link: shareData.shareUrl + '?shareid=' + shareData.shareid, // 分享链接
                        imgUrl: shareData.imgUrl, // 分享图标
                        success: function (res) {
                            //alert('success');
                        },
                        cancel: function (res) {
                            //alert('cancle');
                        },
                        fail: function (res) {
                            $.toast("分享失败，请重新尝试", "cancel");
                        }
                    });
                    wx.onMenuShareAppMessage({
                        title: shareData.title, // 分享标题
                        desc: shareData.desc, // 分享描述
                        link: shareData.shareUrl + '?shareid=' + shareData.shareid, // 商品购买地址
                        imgUrl: shareData.imgUrl, // 分享的图标
                        fail: function (res) {
                            $.toast("分享失败，请重新尝试", "cancel");
                        }
                    });
                }
            });
        };


        $.post("/api/live/" + _this.liveId + "/wxConfig", {courseId: _this.courseId}, function (data) {
            if (data.success) {
                var config = data.data;
                // wx.ready(function () {
                wx.config({
                    debug: false, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
                    appId: config.appid, // 必填，公众号的唯一标识
                    timestamp: config.timestamp, // 必填，生成签名的时间戳
                    nonceStr: config.noncestr, // 必填，生成签名的随机串
                    signature: config.signature,// 必填，签名，见附录1
                    // 必填，需要使用的JS接口列表，所有JS接口列表见附录2
                    jsApiList: ['onMenuShareTimeline', 'onMenuShareAppMessage', 'startRecord', 'stopRecord', 'onVoiceRecordEnd', 'playVoice', 'pauseVoice', 'stopVoice', 'onVoicePlayEnd', 'uploadVoice', 'downloadVoice', 'hideMenuItems']
                });


                wx.ready(function () {
                    //console.log("wx ready");
                    wx.hideMenuItems({
                        menuList: ['menuItem:share:qq', 'menuItem:share:weiboApp', 'menuItem:share:facebook', 'menuItem:share:QZone'] // 要隐藏的菜单项，只能隐藏“传播类”和“保护类”按钮，所有menu项见附录3
                    });

                    wx.error(function (res) {
                        //console.log("wx confit error");
                    });

                    wx.onVoicePlayEnd({
                        success: function (res) {
                            //继续播放下一个
                            curPlayVoice.removeClass("playing");
                            var obj = curPlayVoice.next(".voice");
                            if (obj.length) {
                                onWxVoicePlay(obj.find(".content")[0]);
                            }
                        },
                        fail: function () {
                            //console.log("--------------------------fail");
                        },
                        complete: function () {
                            // console.log("-----------------------onVoicePlayEnd---iiiii");
                        }
                    });

                    var isAllowvoice = sessionStorage.getItem("allow");

                    if (!isAllowvoice) {
                        //通过两秒语音进行微信语音授权
                        wx.startRecord();
                        setTimeout(function () {
                            wx.stopRecord({
                                success: function (res) {
                                    //console.log("获取用户语音授权[success]:" + res.localId);
                                },
                                fail: function () {
                                    //console.log("获取用户语音授权失败[error]");
                                }
                            });
                            sessionStorage.setItem("allow", "true");
                        }, 2000);
                    }

                    //初始化微信语音
                    _this.initVoice();
                    initSahre();
                });
                // });


            } else {
                $.toast(data.msg, 'text');
            }
        });


    },
    initStudent: function () {
        var _this = this;
        $.post("/api/live/" + _this.liveId + "/student", {courseId: _this.courseId}, function (res) {
            if (res.success) {
                var studentList = res.data;
                var slMap = {};
                for (var i = 0; i < studentList.length; i++) {
                    slMap[studentList[i].studentid] = studentList[i];
                }
                _this.studentList = slMap;
            } else {
                $.toast(res.msg, 'text');
            }
        })
    },
    showChatBar: function () {
        //自动滚动
        $('.live').addClass("enter");
        scrollToBottom();
    },
    hideChatBar: function () {
        //自动滚动
        $('#ft_bar_content').attr("class", "ft_bar_content");
        if ($('.live').hasClass("enter")) {
            setTimeout(function () {
                scrollToBottom();
            }, 10)
        }
        $('.live').removeClass("enter");
    },
    initEvent: function () {
        var _this = this;
        //打开红包弹出框
        var currentMsgSeq = '';
        var toUid = '';
        var rpMoney = null;
        $('#chat-list').on('click', '.play_tour', function () {
            $('#redpacked_dialog').fadeIn(200);
            $('#redpacked_dialog .weui-mask').fadeIn(200);
            $('#redpacked_dialog .weui-dialog').fadeIn(200);
            currentMsgSeq = $(this).data('mseq');
            toUid = $(this).data('uid');
        });
        //close dialog
        $('#dialogs').on('click', '.dialog__close', function () {
            $(this).parents('.js_dialog').fadeOut(200);
        });
        //点击弹框 mask 关闭弹窗
        $('.live').on('click', '.weui-mask', function () {
            $.closeModal();
        });

        //底部菜单栏点击事件
        $("#chat-ft>.ft_bar ").on('click', '.weui-flex__item', function () {
            var _openCls = $(this).data("cls");
            if ((_this.bannedInfo.disableInteract || _this.user.disableInteract) && _this.isLecturer === 'false' && _openCls !== 'psetting') {
                $.modal({
                    title: "互动区已经禁言!",
                    buttons: [
                        {
                            text: "知道了",
                        }
                    ]
                });
                return false;
            }
            if ($('#ft_bar_content').hasClass(_openCls)) {
                $('#ft_bar_content').attr("class", 'ft_bar_content');
                _this.hideChatBar();
            } else if (_openCls) {
                var cls = 'ft_bar_content ' + _openCls;
                $('#ft_bar_content').attr("class", cls);
                _this.showChatBar();
            }
        })

        //课程收益
        $('#st_earnings').on('click', function () {
            $.showLoading("加载中...")
            var st = $('#d-earnings').html();
            $.post("/api/account/earnings", {courseId: _this.courseId}, function (res) {
                $.hideLoading();
                if (res.success) {
                    var data = res.data;
                    st = st.replace(/#signupM#/g, data.signup.toFixed(2)).replace(/#shareM#/g, data.share.toFixed(2)).replace(/#msgM#/g, data.msg.toFixed(2));
                    $.modal({
                        title: st,
                        buttons: [
                            {
                                text: "知道了",
                            }
                        ]
                    });
                } else {
                    $.toast("数据加载失败", 'text');
                }
            })
        });

        //收藏
        $('#st_collect').on('click', function () {
            var _$this = $(this);
            if (_$this.data('collected')) {
                $.modal({
                    title: "您已经收藏过了，可在我的收藏查看或者删除!",
                    buttons: [
                        {
                            text: "知道了",
                        }
                    ]
                });
                return false;
            }
            $.post(api.collect(_this.courseId), {courseId: _this.courseId}, function (data) {
                if (data.success) {
                    _$this.data('collected', true);
                    $.toast(data.msg);
                } else {
                    $.toast(data.msg, 'text');
                }
            })
        });
        //$('#star').raty();
        $('#st_comment').on('click', function () {
            $.modal({
                title: "评价",
                text: $('#comment-d').html(),
                buttons: [
                    {
                        text: "提交",
                        onClick: function () {
                            //申请讲师
                            var data = {
                                content: $('#fbcontent').val(),
                                courseId: _this.courseId,
                                ls: $('#ls-star input[name="score"]').val() || 0,
                                cs: $('#cs-star input[name="score"]').val() || 0
                            }
                            if (!$.trim(data.content)) {
                                $.toast("请填写评价内容", 'text');
                                return false;
                            }
                            $.post('/api/course/' + _this.courseId + '/evaluate', data, function (res) {
                                if (res.success === true) {
                                    $('#fbcontent').val("");
                                    $.toast("评价成功");
                                } else {
                                    $.toast(res.msg, 'text');
                                }
                            });
                        }
                    }
                ]
            }, function (dialog) {
                this.addClass('dialog-wrap');
                $('#cs-star').raty({
                    path: '/public/wx/images',
                    score: function () {
                        return $(this).attr('data-score');
                    }
                });
                $('#ls-star').raty({
                    path: '/public/wx/images',
                    score: function () {
                        return $(this).attr('data-score');
                    }
                });
            });
        });

        $('#st_tusou').on('click', function () {
            $.modal({
                title: "投诉",
                text: $('#tousu-d').html(),
                buttons: [
                    {
                        text: "立即投诉",
                        onClick: function () {
                            //申请讲师
                            var data = {content: $('#fbcontent').val(), courseId: _this.courseId}
                            if (!$.trim(data.content)) {
                                return false;
                            }
                            $.post('/api/course/' + _this.courseId + '/feedback', data, function (res) {
                                if (res.success === true) {
                                    $('#fbcontent').val("");
                                    $.modal({
                                        title: "投诉成功，我们的工作人员会及时联系您",
                                        buttons: [
                                            {
                                                text: "知道了",
                                                onClick: function () {
                                                }
                                            }
                                        ]
                                    });
                                } else {
                                    $.toast(res.msg, 'text');
                                }
                            });
                        }
                    }
                ]
            }, function (dialog) {
                this.addClass('dialog-wrap');
            });
        });


        //分享
        $('#st_share').on('click', function () {
            $.modal({
                title: "已为您生成分享的专属链接，点击右上角发送给指定的朋友或朋友圈",
                buttons: [
                    {
                        text: "知道了", onClick: function () {
                    }
                    }
                ]
            });
        });

        //已经修改课程提示
        $('#st_edit').on('click', function () {
            if ($(this).data('end')) {
                $.modal({
                    title: "课程已经结束，不可修改!",
                    buttons: [
                        {
                            text: "知道了",
                        }
                    ]
                });
                return false;
            }
        });

        //结束课程
        $('#st_finish').on('click', function () {
            var _$this = $(this);
            if (_$this.data('end') === 3) {
                $.toast("课程已经结束了", "text");
                return false;
            }

            $.modal({
                title: "是否要结束课程?",
                buttons: [
                    {
                        text: "取消",
                        className: "default"
                    },
                    {
                        text: "结束",
                        onClick: function () {
                            //点击确认后的回调函数
                            var apiUrl = api.liveFinish(_this.liveId);
                            $.post(apiUrl, {courseId: _this.courseId}, function (res) {
                                if (res.success === true) {
                                    _$this.data('end', new Date());
                                    $.toast("结束直播成功", "success");
                                } else {
                                    $.toast("结束直播失败", "text");
                                }
                            });

                        }
                    }
                ]
            });
        });

        //banned 互动区
        $(document).on('change', "#hdCP", function () {
            var b = _this.bannedInfo.disableInteract ? "unbanned" : "banned";
            var data = {
                banned: b,
                type: 3,
                courseId: _this.courseId,
                userId: 0,
                liveId: _this.liveId
            };
            _this.sendBannedMsg(data);
        });

        //banned 讨论区
        $(document).on('change', "#tlqCP", function () {
            var b = _this.bannedInfo.disableForum ? "unbanned" : "banned";
            var data = {
                banned: b,
                type: 1,
                userId: 0,
                courseId: _this.courseId,
                liveId: _this.liveId
            };
            _this.sendBannedMsg(data);
        });

        //banned 解除互动区某个用户取消禁言r
        $(document).on('click', ".unblockm", function () {
            var uid = $(this).data("uid");
            var data = {
                banned: 'unbanned',
                type: 4,
                courseId: _this.courseId,
                userId: uid,
                liveId: _this.liveId
            };
            console.log("banned:解除互动区某个用户取消禁言")
            console.log(data);
            sendBannedMsg(data);
            var cell = $(this).parent('.weui-cell__ft').parent('.weui-cell');
            if (!cell.parent('weui-cells').length) {
                cell.parent('.weui-cells').parent('.uin-list').prev('.dtitle').hide();
            }
            cell.remove();
            var _uid = uid + '';
            var index = $.inArray(_uid, _this.bannedInfo.interact);
            if (index >= 0) {
                _this.bannedInfo.interact.splice(index, 1);
            }
        });


        //banned 点击头像弹出禁言对话框
        $('#chat-list').on('click', '.avatar', function () {
            console.log(_this.isLecturer === 'true');
            if (_this.isLecturer === 'false') { //只有讲师才有这个操作
                return false;
            }
            var uid = $(this).data('uid') + '';
            if ($.inArray(uid, _this.bannedInfo.interact) >= 0) {
                var txt = "解除屏蔽" + _this.studentList[uid].nickname + "学员？"
                $.modal({
                    title: txt,
                    buttons: [
                        {
                            text: "取消", className: "default", onClick: function () {
                            //console.log(3)
                        }
                        },
                        {
                            text: "解除屏蔽", onClick: function () {
                            var data = {
                                banned: 'unbanned',
                                type: 4,
                                userId: uid,
                                courseId: _this.courseId,
                                liveId: _this.liveId
                            };
                            sendBannedMsg(data);
                            var index = $.inArray(uid, _this.bannedInfo.interact);
                            if (index >= 0) {
                                _this.bannedInfo.interact.splice(index, 1);
                            }
                        }
                        }
                    ]
                });
            } else {
                var txt = "确定屏蔽" + _this.studentList[uid].nickname + "学员？"
                $.modal({
                    title: txt,
                    buttons: [
                        {
                            text: "取消", className: "default", onClick: function () {
                            //console.log(3)
                        }
                        },
                        {
                            text: "屏蔽", onClick: function () {
                            var data = {
                                banned: 'banned',
                                type: 4,
                                userId: uid,
                                courseId: _this.courseId,
                                liveId: _this.liveId
                            };
                            sendBannedMsg(data);
                            _this.bannedInfo.interact.push(uid);
                        }
                        }
                    ]
                });
            }

        });

        //banned 屏蔽发言
        var $tpl = $('#banned-d').html();
        var $tplItem = $('#banned-item').html();
        $('#st_shielding').on('click', function () {
            $.showLoading("加载中...")
            $.get('/api/live/' + _this.liveId + '/banned', function (res) {
                if (res.success === true) {
                    _this.bannedInfo = res.data;
                    $.modal({
                        title: "",
                        text: $tpl,
                        buttons: [
                            {
                                text: "关闭",
                                onClick: function () {
                                }
                            }
                        ]
                    }, function (dialog) {
                        this.addClass('dialog-wrap forbid-dialog');
                        var interCheck = this.find('#hdCP'), forumCheck = this.find('#tlqCP');
                        interCheck.attr("checked", _this.bannedInfo.disableInteract == 1);
                        forumCheck.attr("checked", _this.bannedInfo.disableForum == 1);
                        if (_this.bannedInfo.interact.length) {
                            this.find('.dtitle').show();
                        }

                        var $ulist = this.find('.uin-list>.weui-cells');
                        var $htmlStr = "";
                        $.each(res.data.interact, function (index, uid) {
                            var uinfo = _this.studentList[uid];
                            var _tpl = $tplItem
                            $htmlStr += _tpl.replace(/#avatar#/, uinfo.avatar).replace(/#nickName#/, uinfo.nickname).replace(/#uid#/g, uinfo.studentid);
                        });
                        console.log($ulist);
                        $ulist.html($htmlStr);
                    });

                } else {
                    $.toast(res.msg, 'text');
                }
                $.hideLoading();
            });


        });


        var callPay = function (payParam) {
            if (typeof WeixinJSBridge == "undefined") {
                if (document.addEventListener) {
                    document.addEventListener('WeixinJSBridgeReady', onBridgeReady,
                        false);
                } else if (document.attachEvent) {
                    document.attachEvent('WeixinJSBridgeReady', onBridgeReady);
                    document.attachEvent('onWeixinJSBridgeReady', onBridgeReady);
                }
            } else {
                onBridgeReady(payParam);
            }
        }

        var onBridgeReady = function (payParam) {
            WeixinJSBridge.invoke('getBrandWCPayRequest', payParam, function (res) { // 使用以上方式判断前端返回,微信团队郑重提示：res.err_msg将在用户支付成功后返回    ok，但并不保证它绝对可靠。
                if (res.err_msg == "get_brand_wcpay_request:ok") {
                    $('#redpacked_dialog').fadeOut(200);
                    $.toast("赞赏成功!");

                    _this.sendMsgRedpacket({
                        toUid: toUid,
                        fromUid: _this.user.userId,
                        money: rpMoney
                    });
                    // window.location.reload();
                }
                if (res.err_msg == "get_brand_wcpay_request:cancel") {
                    $.toast("交易取消");
                }
                if (res.err_msg == "get_brand_wcpay_request:fail") {
                    $.toast("支付失败", "forbidden");
                }
            });
        }


        var rpMoneyElem = $("#redpacked_dialog .rp_money");
        rpMoneyElem.on('click', function () {
            console.log("money.......");
            rpMoneyElem.removeClass('selected');
            var _this = $(this);
            _this.addClass('selected');
            rpMoney = _this.data("money");
        })

        $('.rp_money_other input[name="rpO"]').change(function () {
            rpMoney = this.value;
        });
        $("#payRedpacket").on('click', function () {
            console.log("pay money.......");
            if (rpMoney <= 0) {
                $.toast("请输入红包金额", 'text');
                return false;
            }

            //支付消息红包

            var postData = {
                'price': rpMoney,
                courseId: _this.courseId,
                'body': "直播消息赞赏",
                msgId: currentMsgSeq,
                msg: "",
                toUid: toUid,
                remark: "直播消息赞赏"
            };
            $.post("/wx/view/order/admire/pre", postData, function (data) {
                if (data.code != null || data.code != '') {
                    var payParam = $.parseJSON(data.data);
                    callPay(payParam)
                } else if (data.msg != null || data.msg != '') {
                    $.toast(data.msg);
                } else {
                    $.toast("网络异常，请重新操作!");
                }
            })
        });

        //隐藏工具栏
        $("#app .page").on('click', function () {
            if ($('#chat-ft').hasClass("doing")) {
                return false;
            }
            _this.hideChatBar();
        })

        $('#refresh').on('click', function () {
            window.location.reload();
        })

        $('#sendCTxtMsg').on('click', function () {
            var text = _this.msgTextInput.val();
            if (!$.trim(text)) {
                $.toast('消息内容不能为空', 'text');
                return;
            }
            _this.sendTextMsg(text);
            _this.hideChatBar();
            $.closePopup("#ptxt");
            _this.msgTextInput.val("");

        })

        $('#chat-list .chat_item .content').on('click', 'img', function () {
            var src = $(this).src();
            var pb1 = $.photoBrowser({
                items: [src]
            });
        })


    },
    initVoice: function () {

        var _this = this;
        var $barVoice = $("#chat-ft");

        //语音录制对象
        this.voiceT = {
            cancelVoice: false,   //是否丢掉录音
            isRecordIng: false,    //是否正在录音
            patternEL: null,   //当前模式容器[语音|录音]
            patternType: 'voice',
            $barVoice: $barVoice,
            minTime: 1,
            maxTime: 59,
            timer: 0,
            intervalId: null,
            cleanInterval: function () {
                var voiceT = this;
                clearInterval(voiceT.intervalId);
                voiceT.resetTimer();
            },
            stopInterval: function () {
                var voiceT = this;
                clearInterval(voiceT.intervalId);
                // voiceT.resetTimer();
            },
            startTimer: function () {
                var voiceT = this;
                //console.log("-----------startTimer:");
                var $timeIng = voiceT.patternEL.find(".voice_time_doing");
                if (voiceT.intervalId) {
                    //停止录音
                    voiceT.cleanInterval();
                }

                //计时器
                voiceT.intervalId = setInterval(function () {
                    var mt = parseInt($timeIng.text());
                    voiceT.timer = mt + 1;
                    //大于最长时间，停止
                    //自己控制录制时长
                    if (voiceT.timer >= voiceT.maxTime) {
                        //录音
                        _this.stopRecordVoice();
                        //停止录音
                        return;
                    }
                    $timeIng.text(_this.voiceT.timer);
                }, 1000)
            },
            resetTimer: function () {
                var $timeIng = this.patternEL.find(".voice_time_doing");
                this.timer = 0;
                $timeIng.text(_this.voiceT.timer);
            }
        };

        wx.onVoiceRecordEnd({
            // 录音时间超过一分钟没有停止的时候会执行 complete 回调
            complete: function (res) {
                var localId = res.localId;
                //console.log("语音超过一分钟,自己控制时间了，这个不应该触发");
                // _this.uploadVoice(localId);
            }
        });


        // //====== 切换语音模式
        // $('#pvoice').on('click', function () {
        //     //自动滚动
        //     scrollToBottom();
        //     $('#ft_bar_content').toggleClass("pvoice").removeClass('psetting');
        // });

        //====== 语音模式
        $(".to_voice").hammer().bind('tap', function () {
            $(".pattern.voice").show().siblings().hide();
            _this.voiceT.patternEL.removeClass("stop");
            _this.voiceT.isStop = false;
            _this.voiceT.isRecordIng = false;
        });
        // ====录音模式
        $(".to_record").hammer().bind('tap', function () {
            $(".pattern.record").show().siblings().hide();
            _this.voiceT.isRecordIng = true;
        });


        var voiceMc = new Hammer($(".voice .wave em")[0], {
            direction: Hammer.DIRECTION_VERTICAL,
            time: 3000
        });
        voiceMc.on('pan', function (ev) {
            //console.log(ev);
        });

        //开始录音
        voiceMc.on("press", function (e) {
            if (_this.voiceT.$barVoice.hasClass('doing')) { //正在录音
                return false;
            }
            _this.voiceT.patternEL = $("#ft_bar_content .voice");
            _this.voiceT.$barVoice.addClass("doing");
            _this.startRecordVoice();
            //console.log("start voice");
        });

        voiceMc.on("pressup", function () {
            _this.voiceT.$barVoice.removeClass("doing");
            _this.stopRecordVoice();
        });

        //向上滑动取消语音
        voiceMc.on("panend", function (e) {
            //console.log(e)
            //取消录音
            _this.stopRecordVoice();
            _this.voiceT.cancelVoice = true;
            _this.voiceT.$barVoice.removeClass("doing");
            //console.log("panup panend cancel voice");
        });

        var recordMc = new Hammer($(".record .wave em")[0]);
        //开始录音
        recordMc.on("tap", function () {
            _this.voiceT.patternEL = $("#ft_bar_content .record");
            if (_this.voiceT.$barVoice.hasClass('doing')) { //如果，正在录音,取消录音
                if (_this.voiceT.$barVoice.hasClass('stop')) {
                    var _d = $(document).data("stopVoice");
                    _this.uploadVoice(_d.localId, _d.second);
                    _this.voiceT.$barVoice.removeClass("doing");
                    _this.voiceT.$barVoice.removeClass("stop");
                    _this.voiceT.cleanInterval();
                    _this.voiceT.isStop = false;
                    return false;
                } else {
                    // _this.voiceT.$barVoice.removeClass("doing");
                    _this.voiceT.$barVoice.addClass("stop");
                    _this.voiceT.isStop = true;
                    _this.stopRecordVoice();
                    return false;
                }
            }
            _this.voiceT.isRecordIng = true;
            _this.voiceT.$barVoice.addClass("doing");
            _this.startRecordVoice();
        });

        var recordMc2 = new Hammer($(".record .cancel-record")[0])
        recordMc2.on("tap", function () {
            _this.voiceT.$barVoice.removeClass("doing");
            _this.voiceT.$barVoice.removeClass("stop");
            _this.voiceT.isStop = false;
            _this.voiceT.cancelVoice = true;
            _this.stopRecordVoice();
        });


    },
    startRecordVoice: function () {
        this.voiceT.cancelVoice = false;
        wx.startRecord();
        this.voiceT.startTimer();//开始计时
    },
    stopRecordVoice: function () {
        var _this = this;
        var voiceT = this.voiceT;
        var second = voiceT.timer;
        if (second < 2) {
            $.toast("录音时间太短", "text");
            return;
        }

        if (!voiceT.isStop) {
            voiceT.cleanInterval();
        } else {
            voiceT.stopInterval();
        }
        //console.log("wx record voice stop ");
        wx.stopRecord({
            success: function (res) {
                var localId = res.localId;
                //console.log(res)
                if (!voiceT.cancelVoice) {
                    //console.log("wx record voice stop localId:" + res.localId);
                    //上传语音
                    if (!voiceT.isStop) {
                        _this.uploadVoice(localId, second);
                        //[录音模式]继续下一条录音
                        if (voiceT.isRecordIng) {
                            _this.startRecordVoice();
                        }
                        if (!voiceT.isRecordIng) {
                            voiceT.$barVoice.removeClass("doing");
                        }
                    } else {
                        $(document).data("stopVoice", {
                            localId: localId, second: second
                        });
                        voiceT.stopInterval();
                    }

                }
            },
            fail: function () {
                //console.log("stopRecordVoice:" + fail);
            }
        });

    },
    uploadVoice: function (localId, second) {
        var _this = this;
        wx.uploadVoice({
            localId: localId, // 需要上传的音频的本地ID，由stopRecord接口获得
            isShowProgressTips: 1, // 默认为1，显示进度提示
            success: function (res) {
                var serverId = res.serverId; // 返回音频的服务器端ID
                //console.log("voice upload success serverId:" + serverId);
                //发送ajax存储文件id
                // $.post("/api/live/" + _this.liveId + "/pushVoice", {voiceId: serverId}, function (_res) {
                //     if (_res.success) {
                // //console.log("------------voice updload ok")
                //上传微信成功发送消息
                _this.sendVoiceMsg(serverId, localId, second);
                //     }
                // });
            }
        });
    },

    /**
     * 初始化讨论区功能
     */
    initForumMod: function () {
        var _this = this;
        var tlq = {
            init: function () {
                this.isLoading = false;
                this.pageIndex = 1;
                this.pageCount = 1;
                this.noContent = false;
                this.elem = $("#tlq");
                this.pannel = this.elem.find(".weui-panel");
                this.itemTpl = $("#tlq-item-template").html();
                this.dataContainer = this.elem.find('.data-list');
                this.ajaxUrl = _this.baseUrl + "/forum";
                this.loadmore = this.elem.find('.weui-loadmore');
                this.loadmoreTips = this.loadmore.find('.weui-loadmore__tips');
                return this;
            },
            loading: function () {
                (this.pageIndex == 1) && this.pannel.addClass("loading");
                this.loadmore.show();
            },
            unloading: function () {
                (this.pannel.hasClass("loading")) && this.pannel.removeClass("loading");
                tlq.loadmore.hide();
            },
            renderForum: function (_data, isAppend) {
                var _size = _data.length;
                if (_data.length > 0) {
                    var htmlStr = "";
                    $.each(_data, function (index, obj) {
                        //fix banned is empty
                        obj.banned_id = obj.banned_id ? obj.banned_id : "";

                        var _item = tlq.itemTpl;

                        _item = _item.replace(/#delshow#/g, ((_this.isLecturer == true) || (obj.user_id == _this.user.userId)) ? "inline" : "none");
                        _item = _item.replace(/#userType#/g, obj.user_type == 1 ? "讲师" : "学生");
                        _item = _item.replace(/#bannedTxt#/g, obj.banned_id ? "已被禁言" : "禁言");
                        _item = _item.replace(/#bannedDis#/g, obj.banned_id ? "disabled='true'" : "");
                        _item = _item.replace(/#towallTxt#/g, obj.is_to_wall ? "已上墙" : "上墙");
                        _item = _item.replace(/#towallDis#/g, obj.is_to_wall ? "disabled='true'" : "");
                        $.each(obj, function (key, val) {
                            var key = new RegExp('#' + key + '#', 'g');
                            _item = _item.replace(key, val);
                        });
                        htmlStr += _item;
                    });
                    isAppend ? (tlq.dataContainer.append(htmlStr), tlq.pageIndex = tlq.pageIndex + 1) : tlq.dataContainer.html(htmlStr);
                }
                tlq.unloading();
            },
            /**
             * 加载讨论内容
             * @param data
             * @param isAppend
             */
            loadForum: function (params, isAppend) {

                tlq.loading();

                var option = {
                    type: "GET",
                    url: tlq.ajaxUrl,
                    async: false,
                    success: function (res) {
                        var _data = res.data.list;
                        tlq.pageCount = res.data.pageCount;
                        tlq.renderForum(_data, isAppend);
                    }
                };
                params.pageIndex = tlq.pageIndex;
                option.data = params;

                if (tlq.pageIndex <= tlq.pageCount) {
                    tlq.loadmore.removeClass("noContent")
                    tlq.loadmoreTips.text("正在加载");
                    $.ajax(option);
                } else {
                    tlq.loadmore.addClass("noContent")
                    tlq.loadmoreTips.text("没有更多内容了");
                }
            },
            del: function () {
                $.showLoading();
                var elm = $(this);
                var id = elm.data("id");
                var data = {
                    forumId: id,
                };
                //console.log(data);
                $.post(tlq.ajaxUrl + "/del", data, function (res) {
                    if (res.success === true) {
                        $.toast("删除成功", "success");
                        elm.parents(".weui-media-box").remove();
                    } else {
                        $.toast("删除失败", "text");
                    }
                    $.hideLoading();
                });
            },
            toall: function () {
                var elm = $(this);
                if (this.disabled) {
                    return false;
                }
                var isTowall = elm.data("towall");
                if (isTowall == true) {
                    $.toast('已经上过墙了', 'text');
                    return false;
                }
                var content = elm.parent('.weui-media-box__bar').prev(".weui-media-box__desc").text();
                var msgData = {
                    id: elm.data("id"),
                    uid: elm.data("uid"),
                    uname: enUnicode(elm.data("uname")),
                    content: enUnicode(content),
                    type: 'towall'

                };

                $.modal({
                    title: "上墙",
                    text: $('#towall-d').html(),
                    buttons: [
                        {
                            text: "取消",
                            className: "default"
                        },
                        {
                            text: "上墙",
                            onClick: function () {
                                // $.showLoading();
                                //上墙
                                var param = {forumId: msgData.id, remark: $('#towallContent').val()};
                                msgData.remark = enUnicode($.trim(param.remark));
                                $.post('/api/course/' + _this.courseId + '/forum/towall', param, function (res) {
                                    if (res.success === true) {
                                        $('#towallContent').val("");
                                        _this.sendTowallMsg(msgData);
                                        elm.attr("disabled", true);
                                        elm.attr("data-towall", true);
                                        $.toast("上墙成功", 'text');
                                    } else {
                                        $.toast(res.msg, 'text');
                                    }
                                });
                            }
                        }
                    ]
                }, function (dialog) {
                    this.addClass('dialog-wrap');
                });

            },

            banned: function () {
                // $.showLoading();
                // //console.log("banned");
                var elm = $(this);
                if (this.disabled) {
                    return false;
                }
                var isBanned = elm.data("banned");
                var data = {
                    banned: isBanned ? "unbanned" : "banned",
                    courseId: _this.courseId,
                    userId: elm.data("uid"),
                    type: 2, //屏蔽讨论区
                    liveId: _this.liveId
                };
                _this.sendBannedMsg(data);
                elm.attr("data-banned", data.banned);
                this.disabled = true;
                elm.text("已被禁言")
                // var ajaxUrl = "/wx/view/live/" + _this.liveId + "/banned"
                // $.post(ajaxUrl, data, function (res) {
                //     if (res.success === true) {
                //         $.toast("操作成功", "success");
                //         //屏蔽成功发送系统消息
                //         tlq.loadForum({}, false);
                //         _this.user.isbf = isBanned ? false : true;
                //     } else {
                //         $.toast(":操作失败", "text");
                //     }
                //     $.hideLoading();
                // });
            }


        };
        _this.tlq = tlq.init();

        //发讨论
        $('#forum-btn').on('click', function () {
            var $finput = $('#forum-input');
            var val = $finput.val();
            // //console.log(_this.user);
            if (_this.user.disableForum) {
                $.toast("您已被禁言", "text");
                return false;
            }
            if (_this.bannedInfo.disableForum && _this.isLecturer !== 'true') {
                $.toast("讨论区已被禁言", "text");
                return false;
            }
            if (_this.user.disableForum) {
                $.toast("你已经被禁言", "text");
                return false;
            }
            if (!$.trim(val)) {
                $.toast("请填写讨论内容", "text");
                return false;
            }
            $.post(tlq.ajaxUrl, {content: val}, function (res) {
                if (res.success === true) {
                    $.toast("发布成功", "success");
                    $finput.val("");
                    tlq.pageIndex = 1;
                    tlq.pageCount = 1;
                    tlq.loadForum({}, false);
                } else {
                    $.toast("发布失败", "text");
                }
            });
        });

        //下拉加载讨论内容
        $("#tlq .page__bd").infinite().on("infinite", function () {
            // //console.log("start loading more");
            tlq.loadmore.show();
            if (tlq.isLoading) return;
            tlq.isLoading = true;
            setTimeout(function () {
                tlq.loadForum({}, true);
                tlq.isLoading = false;
            }, 1500);   //模拟延迟
        });

        //打开弹出框
        $(document).on("open", ".j-tlq-model", function () {
            //加载讨论区内容
            tlq.loadForum({}, false);
        });

        //删除
        $("#tlq").on("click", ".del", tlq.del);

        //禁言
        $("#tlq").on("click", ".banned", tlq.banned);
        //上墙
        $("#tlq").on("click", ".towall", tlq.toall);

    }
    ,

    /**
     * 初始化 素材模块
     */
    initMaterialMod: function () {
        var _this = this;
        //讲师素材
        var lmt = {
            init: function () {
                this.isLoading = false;
                this.pageIndex = 1;
                this.pageCount = 1;
                this.noContent = false;
                this.elem = $("#st_material");
                this.ptext = $("#ptxt");
                this.pannel = this.elem.find(".weui-panel");
                this.itemTpl = $("#lmt-item-template").html();
                this.sendItemTpl = $("#lmt-send-item-template").html();
                this.dataContainer = this.elem.find('.data-list');
                this.sendList = this.ptext.find('.data-list');
                this.ajaxUrl = _this.baseUrl + "/material";
                this.loadmore = this.elem.find('.weui-loadmore');
                this.loadmoreTips = this.loadmore.find('.weui-loadmore__tips');
                this.msgTextInput = this.ptext.find("#msg-text-input");
                _this.msgTextInput = this.msgTextInput;
                return this;
            },
            getLoadmore: function () {
                if (lmt.isSend) {
                    return lmt.ptext.find('.weui-loadmore');
                } else {
                    return lmt.elem.find('.weui-loadmore');
                }
            },
            getLoadmoreTips: function () {
                if (lmt.isSend) {
                    return lmt.ptext.find('.weui-loadmore .weui-loadmore__tips');
                } else {
                    return lmt.elem.find('.weui-loadmore .weui-loadmore__tips');
                }
            },
            getPannel: function () {
                if (lmt.isSend) {
                    return lmt.ptext.find(".weui-panel");
                } else {
                    return lmt.elem.find(".weui-panel");
                }
            },

            /**
             * 加载 素材列表
             *
             * @param params
             * @param isAppend
             * @param isSend
             */
            loadMaterial: function (params, isAppend) {
                lmt.loading();
                var url = _this.baseUrl + "/material";
                var $list = lmt.isSend ? lmt.sendList : lmt.dataContainer
                var option = {
                    type: "GET",
                    url: url,
                    async: false,
                    success: function (res) {
                        var _data = res.data.list;
                        lmt.pageCount = res.data.pageCount;
                        lmt.renderList(_data, isAppend, $list);
                        lmt.unloading()
                    }
                };
                params.pageIndex = lmt.pageIndex;
                option.data = params;

                if (lmt.pageIndex <= lmt.pageCount) {
                    lmt.getLoadmore().removeClass("noContent")
                    lmt.getLoadmoreTips().text("正在加载");
                    $.ajax(option);
                } else {
                    lmt.getLoadmore().addClass("noContent")
                    lmt.getLoadmoreTips().text("没有更多内容了");
                }
            },
            loading: function () {
                !lmt.isSend && (this.pageIndex == 1) && this.getPannel().addClass("loading");
                this.getLoadmore().show();
            },
            unloading: function () {
                !lmt.isSend && (this.getPannel().hasClass("loading")) && this.getPannel().removeClass("loading");
                lmt.getLoadmore().hide();
            },
            renderList: function (_data, isAppend, $dataContainer) {
                var _size = _data.length;
                if (_data.length > 0) {
                    var htmlStr = "";
                    $.each(_data, function (index, obj) {

                        var _item = lmt.isSend ? lmt.sendItemTpl : lmt.itemTpl;
                        _item = _item.replace(/#cteatedTime#/g, function () {
                            var d = new Date(obj.createdTime);
                            return (d.getMonth() + 1) + "/" + d.getDate() + " " + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
                        });
                        $.each(obj, function (key, val) {
                            var key = new RegExp('#' + key + '#', 'g');
                            _item = _item.replace(key, val);
                        });
                        htmlStr += _item;
                    });

                    isAppend ? ($dataContainer.append(htmlStr), lmt.pageIndex = lmt.pageIndex + 1) : $dataContainer.html(htmlStr);
                }
                lmt.unloading();
            },
            del: function () {
                var elm = $(this);
                var id = elm.data("id");
                var data = {
                    materialId: id,
                };
                $.post(lmt.ajaxUrl + "/del", data, function (res) {
                    if (res.success === true) {
                        $.toast("删除成功", "success");
                        elm.parents(".weui-media-box").remove();
                    } else {
                        $.toast("删除失败", "text");
                    }
                });

            },
            toStick: function () {
                $.showLoading();
                var elm = $(this);
                var isStick = elm.data("stick") == true;
                //console.log("toStick:" + elm.data("stick"));
                var data = {
                    isStick: !isStick,
                    materialId: elm.data("id"),
                };

                var ajaxUrl = lmt.ajaxUrl + "/stick"
                $.post(ajaxUrl, data, function (res) {
                    if (res.success === true) {
                        $.toast("置顶成功", "success");
                        //屏蔽成功发送系统消息
                        lmt.loadMaterial({}, false);
                    } else {
                        $.toast("置顶失败", "text");
                    }
                    $.hideLoading();
                });
            },
            toSend: function () {
                var elm = $(this).find(".weui-media-box__desc");
                //console.log("text:" + elm.text());
                lmt.msgTextInput.val(elm.text());
            },
            reset: function () {
                lmt.pageIndex = 1;
                lmt.pageCount = 1;
            }
        };

        $(document).on("open", ".stma", function () {
            //加载素材内容
            //console.log("open stma popup");
            lmt.isSend = false;
            lmt.reset();
            lmt.loadMaterial({}, false);
        });

        $(document).on("open", ".ptxt", function () {
            //自动滚动
            scrollToBottom();
            //是讲师加载素材
            if (_this.user.userId == _this.lecturerId) {
                lmt.isSend = true;
                lmt.reset();
                lmt.loadMaterial({}, false);
            } else {
                lmt.ptext.find('.weui-loadmore').hide();
            }
        });

        $('#ma-btn').on('click', function () {
            var $minput = $('#ma-input');
            var val = $minput.val();
            if (!$.trim(val)) {
                _this.showToast("请填写素材内容");
                return false;
            }
            $.post(_this.baseUrl + "/material", {content: val}, function (res) {
                if (res.success === true) {
                    $.toast("素材添加成功", "text");
                    $minput.val("");
                    lmt.reset();
                    lmt.loadMaterial({}, false);
                } else {
                    $.toast("素材添加失败", "text");
                }
            })
        });

        lmt.maLoading = false;

        $("#st_material .page__bd").infinite().on("infinite", function () {
            if (lmt.maLoading) return;
            lmt.maLoading = true;
            setTimeout(function () {
                lmt.loadMaterial({}, true);
                lmt.maLoading = false;
            }, 1500);   //模拟延迟
        });

        //删除
        $("#st_material").on("click", ".del", lmt.del);

        //置顶
        $("#st_material").on("click", ".stick", lmt.toStick);
        //发送文本
        $("#ptxt").on("click", ".toSend", lmt.toSend);


        _this.lmt = lmt.init();
    }
    ,
    /**
     * 发送屏蔽消息
     * @param data
     * <pre>
     *     {
                banned: b,
                type: 3, //3:表示屏蔽互动区
                courseId: _this.courseId
            }
     * </pre>
     */
    sendBannedMsg: function (data) {
        sendBannedMsg(data);
    },

    /**
     * 处理收到的屏蔽消息
     * @param data
     */
    onBannedMsg: function (data) {
        var _this = this;
        console.log("onBannedMsg:");
        console.log(data);
        console.log(_this)
        var type = data.btype;
        var banned = data.banned;
        var userId = data.userId + '';
        switch (type) {
            case 1: //1:整个讨论区禁言
                if (banned === "banned") {
                    _this.bannedInfo.disableForum = '1';
                } else {
                    _this.bannedInfo.disableForum = 0;
                }
                console.log(_this.bannedInfo);
                break;
            case 2: //2:讨论区中某个用户禁言
                if (userId !== _this.user.userId) {
                    break;
                }

                if (banned === "banned") {
                    // _this.bannedInfo.disableInteract = '1';
                    _this.user.disableForum = '1';
                } else {
                    // _this.bannedInfo.disableInteract = '0';
                    _this.user.disableForum = 0;
                }
                break;
            case 3: //3：整个互动区禁言
                if (banned === "banned") {
                    _this.bannedInfo.disableInteract = '1';
                } else {
                    _this.bannedInfo.disableInteract = 0;
                }
                break;
            case 4: //4:互动区中某个用户禁言
                if (userId !== _this.user.userId) {
                    break;
                }

                if (banned === "banned") {
                    // _this.bannedInfo.disableInteract = 1;
                    _this.user.disableInteract = '1';
                } else {
                    // _this.bannedInfo.disableInteract = 0;
                    _this.user.disableInteract = 0;
                }
                break;
            default:
                break;
        }
    },
    sendTextMsg: function (text) {
        sendTxtMsg(text);
    }
    ,
    /**
     * 发送语音消息
     * @param uuid
     * @param localId
     * @param second
     */
    sendVoiceMsg: function (uuid, localId, second) {
        sendVoiceMsg(uuid, localId, second);
    }
    ,
    /**
     * 发送赞赏消息
     * @param json
     */
    sendTowallMsg: function (json) {
        sendToWallMsg(json);
    },
    /**
     * 发送消息赞赏消息
     * @param json
     */
    sendMsgRedpacket: function (json) {
        sendToMsgRedpacketMsg(json);
    },

    fixPressEvent: function () {
        //屏蔽微信 长按菜单
        var t;
        var $pointer = $('.ft_bar_voice');
        var cancelTimeout = function () {
            if (t) {
                clearTimeout(t);
                t = null;
            }
        };
        $pointer.on('touchstart', function (e) {
            t = setTimeout(function () {
                // alert('2s!');
                cancelTimeout();
            }, 2000);
            e.preventDefault();
            return false;
        })
        $pointer.on('touchend', cancelTimeout);
        $pointer.on('touchcancel', cancelTimeout);
    }
    ,
    initImgUpload: function () {
        var _this = this;
        var uploadObj = {
            init: function () {
                var _this = this;
                $.post("/api/file/sign", function (res) {
                    _this.initUpload(res.data);
                    uploadObj.sign = res.data.sign;
                })
            },
            initUpload: function (data) {
                var _this = this;
                var uploader = this.uploader = WebUploader.create({
                    // swf文件路径
//            swf: '/public/plugins/webuploader/Uploader.swf',
                    // 文件接收服务端。
                    server: 'http://web.image.myqcloud.com/photos/v2/' + data.appid + "/" + data.bucket + "/0",
                    // 选择文件的按钮。可选。
                    // 内部根据当前运行是创建，可能是input元素，也可能是flash.
                    pick: '#pimg',
                    auto: true,
                    fileVal: 'FileContent',
                    // 不压缩image, 默认如果是jpeg，文件上传前会压缩一把再上传！
                    resize: false,
                    accept: {
                        title: 'Images',
                        extensions: 'gif,jpg,jpeg,bmp,png'
                    }
                });
                //上传之前添加一些附加参数
                uploader.on('uploadBeforeSend', uploadObj.uploadBeforeSend);
                // 当有文件添加进来的时候
                uploader.on('fileQueued', uploadObj.fileQueued);
                // 文件上传成功回调
                uploader.on('uploadSuccess', uploadObj.uploadSuccess);
                //上传失败
                uploader.on('uploadError', uploadObj.uploadError);
            },
            uploadBeforeSend: function (object, _data, headers) {
                if (uploadObj.md5) {
                    _data['Md5'] = uploadObj.md5;
                }
                var userId = $("#userId").val();
                var liveId = $("#liveId").val();
                _data['MagicContext'] = JSON.stringify({
                    userId: userId,
                    liveId: liveId,
                    type: 4,
                    remark: '直播消息图片'
                });
                headers['Authorization'] = uploadObj.sign;
            },
            fileQueued: function (file) {
                $.showLoading();
                var _this = this;
                // 创建缩略图
                // 如果为非图片文件，可以不用调用此方法。
                // thumbnailWidth x thumbnailHeight 为 100 x 100
                uploadObj.uploader.makeThumb(file, function (error, src) {

                }, 640, 640);
                //计算md5
                uploadObj.uploader.md5File(file)
                // 及时显示进度
                    .progress(function (percentage) {
                        //console.log('Percentage:', percentage);
                    })
                    // 完成
                    .then(function (val) {
                        uploadObj['md5'] = val;
                    });

            },
            uploadSuccess: function (file, res) {
                uploadObj.uploader.removeFile(file, true);
                var fdata = res.data;
                var info = fdata.info[0][0];
                var imgInfo = {
                    id: fdata.fileid,
                    size: file.size,
                    width: info.width,
                    height: info.height,
                    download_url: fdata.download_url
                }
                //发送图片消息
                sendImageMsg(imgInfo);
                $.hideLoading();
            },
            uploadError: function (file) {
                $.toast('图片发送失败', 'text');
                setTimeout(function () {
                    $.toast('头像修改失败', 'text');
                }, 2000);
            }
        };
        //初始化
        uploadObj.init();
    },
    scrollDirect: function (selector, fn) {
        var beforeScrollTop = document.body.scrollTop;
        fn = fn || function () {
            };
        window.addEventListener("scroll", function (event) {
            event = event || window.event;

            var afterScrollTop = document.body.scrollTop;
            delta = afterScrollTop - beforeScrollTop;
            beforeScrollTop = afterScrollTop;

            var scrollTop = $(selector).scrollTop();
            var scrollHeight = $(document).height();
            var windowHeight = $(selector).height();
            if (scrollTop + windowHeight > scrollHeight - 10) {  //滚动到底部执行事件
                fn('up');
                return;
            }
            if (afterScrollTop < 10 || afterScrollTop > $(document.body).height - 10) {
                fn('up');
            } else {
                if (Math.abs(delta) < 10) {
                    return false;
                }
                fn(delta > 0 ? "down" : "up");
            }
        }, false);
    }

}
;

