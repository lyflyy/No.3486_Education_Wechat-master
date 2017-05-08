$(function () {
    var $searchBar = $('#searchBar'),
        $searchAwResult = $('#searchAwResult'),
        $searchAwResultList = $('#searchAwResult .list'),
        $awLoading = $('#searchAwResult .weui-loadmore'),
        $searchResult = $('#searchResult'),
        $searchResultList = $('#searchResult .list'),
        $resultLoading = $('#searchResult .weui-loadmore'),
        $searchText = $('#searchText'),
        $searchInput = $('#searchInput'),
        $searchClear = $('#searchClear'),
        $searchCancel = $('#searchCancel'),
        $weuimsg = $('.weui-msg'),
        $weuimsgTxt = $('.weui-msg .weui-msg__desc'),
        $home = $(".page.home");

    var xhr = null, url = "/api/search/";
    var timeId = null;


    function showSearchPannel() {
        $searchBar.addClass('weui-search-bar_focusing');
        $home.addClass("search");
        $searchResult.hide();
    }

    function hideSearchResult() {
        $searchAwResult.hide();
        $searchResult.hide();
        $searchInput.val('');
        $home.removeClass("search");
    }

    function cancelSearch() {
        hideSearchResult();
        $searchBar.removeClass('weui-search-bar_focusing');
        $searchText.show();
    }

    function renderAw(data) {
        var tpl = $("#awItem").html();
        var strHtml = "";
        for (var i = 0; i < data.length; i++) {
            var _tpl = tpl;
            strHtml += _tpl.replace(/#content#/g, data[i].text);
        }
        $searchAwResultList.html(strHtml);
    }

    function renderCourse(data) {
        var tpl = $("#courseItem").html();
        if(data.length){
            var strHtml = "";
            for (var j = 0; j < data.length; j++) {
                var _tpl = tpl;
                _tpl = _tpl.replace(/#nickName#/g, data[j].lecturer.nick_name)
                    .replace(/#name#/g, data[j].name)
                    .replace(/#member#/g, data[j].sigup_count + data[j].audit_count)
                    .replace(/#title#/g, data[j].lecturer.title)
                    .replace(/#avatar#/g, data[j].avatar)
                    .replace(/#status#/g, data[j].status)
                    .replace(/#id#/g, data[j].id);

                if (data[j].is_high_quality) {
                    _tpl = _tpl.replace(/#you#/g, '<span class="quality vke-icon-you"></span>');
                }
                strHtml += _tpl;
            }
            $searchResultList.html(strHtml);
        } else {
            $searchResultList.html("");
            $weuimsgTxt.text('抱歉没有找到相关的课程');
            $weuimsg.show();
        }
    }

    function renderUser(data) {
        var tpl = $("#userItem").html();
        var strHtml = "";
        if (data.length){
            for (var k = 0; k < data.length; k++) {
                var _tpl = tpl;
                _tpl.replace(/#nickname#/g, data[k].nick_name)
                    .replace(/#subcount#/g, data[k].subscibe_count)
                    .replace(/#title#/g, data[k].title)
                    .replace(/#avatar#/g, data[k].avatar)
                    .replace(/#id#/g, data[k].id);

                if (data[k].is_high_quality) {
                    _tpl.replace(/#you#/g, '<span class="quality vke-icon-you"></span>');
                }
                strHtml += _tpl;
            }
            $searchResultList.html(strHtml);
        } else {
            $searchResultList.html("");
            $weuimsgTxt.text('抱歉没有找到相关的讲师');
            $weuimsg.show();
        }
    }

    $searchText.on('click', function () {
        showSearchPannel();
    });

    $searchInput
        .on('blur', function () {
            if (!this.value.length) cancelSearch();
        })
        .on('focus', function () {
            showSearchPannel();
        })
        .bind('input propertychange', function () {
            var val = this.value;
            if (val.length) {
                $searchAwResult.show();
                if (val.length < 1) {
                    return;
                }
                var options = {
                    dataType: 'json',
                    beforeSend: function () {
                        $awLoading.show();
                    },
                    data: {q: val},
                };
                if (xhr) {
                    xhr.abort();
                }
                if (timeId) {
                    clearTimeout(timeId);
                }
                timeId = setTimeout(function () {
                    xhr = $.ajax(url, options).done(function (res) {
                        if (res.success) {
                            renderAw(res.data.rows);
                        } else {
                            $.toast('没搜到相关数据...', 'text')
                        }

                    }).fail(function () {
                        $.toast('没搜到相关数据...', 'text')
                    }).always(function () {
                        $awLoading.hide();
                    });
                }, 1000)
            } else {
                $searchAwResult.hide();
            }
        });
    ;
    $searchClear.on('click', function () {
        hideSearchResult();
        $searchInput.focus();
    });
    $searchCancel.on('click', function () {
        cancelSearch();
        $searchInput.blur();
    });
    function search(val, type) {
        $searchResultList.find('.weui-loadmore_line').hide();
        $weuimsg.hide();
        //查询搜索结果
        var options = {
            dataType: 'json',
            beforeSend: function () {
                console.log("before send")
                $resultLoading.show();
            },
            data: {
                q: val,
                type: type
            },
        };
        if (xhr) {
            xhr.abort();
        }

        xhr = $.ajax(url, options).done(function (res) {
            var len = res.data.rows.length;
            if (res.success) {
                if (type == 'c') {
                    renderCourse(res.data.rows);
                }

                if (type == 'l') {
                    renderUser(res.data.rows);
                }
            } else {
                // $searchResultList.html("");
                // $searchResultList.find('.weui-loadmore_line').show();
                $.toast('没搜到相关数据...', 'text')

            }

        }).fail(function () {
            $.toast('没搜到相关数据...', 'text')
        }).always(function () {
            $resultLoading.hide();
        });
    }

    var type = null;
    var searchKey = null;
    $('#searchAwResult').on('click', '.aw-iterm', function () {
        //搜索，并显示搜索结果
        $searchAwResult.hide();
        $searchResult.show();
        searchKey = $(this).find(".weui-cell__bd p").text();
        type = $(".cm_menu_group .active").data("type");
        search(searchKey, type);


    });

    $('.cm_menu_group a').on('click', function () {
        $('.cm_menu_group a').removeClass('active');
        $(this).addClass('active')
        var _type = $(this).data('type');
        search(searchKey, _type);
        _type = _type;
    });

    //当滚动条的位置处于距顶部100像素以下时，跳转链接出现，否则消失

    $(window).scroll(function () {
        if (re) {
            clearTimeout(re);
            re = null;
        }
        re = setTimeout(function () {
            if ($(window).scrollTop() > 100) {
                bckBtn.fadeIn(300);
            } else {
                bckBtn.fadeOut(300);
            }
        }, 100)
    })
    var bckBtn = $("#back-to-top");
    var re = null;

    bckBtn.click(function () {
        $('body,html').animate({scrollTop: 0}, 550);
        return false;
    });


});





