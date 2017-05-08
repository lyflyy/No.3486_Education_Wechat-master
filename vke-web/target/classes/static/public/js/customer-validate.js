/**
 *
 * Created by huziwang on 5/1/16.
 */

$(function () {
    var $y = $("select[name='year']"),
    $m = $("select[name='month']"),
        $d = $("select[name='day']");
    /**
     * 如果3-6周岁之间，没有任何提示，如果小于3周岁大于等于2周岁，或者大于6周岁，小宇等于8周岁，都会提示，
     * 选择的出生日期没有在正常的上学年龄，是否继续，选择否，会禁用下一步按钮
     * 如果小于2周岁，大于8周岁，会提示年龄不符合上学年龄，请重新选择出生日期
     * @type {{s: number[], m: number[], l: number[], x1: number[], x2: number[], x3: number[], x4:
     *     number[], x5: number[], x6: number[], c1: number[], c2: number[], c4: number[], g1:
     *     number[], g2: number[], g3: number[]}}
     *
     */
    var ageRangeValide = {
        s: [4, 5, 1, 2],  //幼儿园
        m: [5, 6, 1, 2],
        l: [6, 7, 1, 1],

        x1: [7, 8, 2, 1], //小学
        x2: [8, 9, 2, 1],
        x3: [9, 10, 2, 1],
        x4: [10, 11, 2, 2],
        x5: [11, 12, 2, 2],
        x6: [12, 13, 2, 2],

        c1: [13, 14, 2, 2], //初中
        c2: [14, 15, 2, 2],
        c4: [14, 16, 2, 2],

        g1: [15, 17, 2, 2], //高中
        g2: [16, 18, 2, 2],
        g3: [17, 19, 2, 2]
    };

    function getDate() {
        var y = $y.find("option:selected").val();
        var m = $m.find("option:selected").val();
        var d = $d.find("option:selected").val();
        if (m < 10) {
            m = "0" + m;
        }

        if (d < 10) {
            d = "0" + d;
        }

        var dateStr = y + "/" + m + "/" + d;
        return new Date(dateStr);
    }

    function getDiffYear() {
        var currentDate = new Date();
        var dateAge = getDate();
        var diff = 0;
        try {
            diff = (currentDate.getTime() - dateAge.getTime()) / (24 * 60 * 60 * 1000 * 30 * 12)
        } catch (Exception) {
        }
        return diff;
    }

    /**
     * 上学级别
     */
    function validateLevel(form) {
        var result = true;
        var wrap = "";
        if ($("input[name='sxlx']").length) {
            var id = $("input[name='sxlx']:checked").attr("id");
            if (id == 'sxlxno') {

                if (getDiffYear() > 6) {
                    //如果大于6周岁选择幼儿园
                    result = confirm("提示：请根据出生日期选择正确的教育阶段,是否继续？");
                }
            } else {
                result = true;
                wrap = $("#" + id).parent().next();
            }

            if (result && wrap.find("select[name='sxjb']").length) {
                var key = wrap.find("select[name='sxjb'] option:selected").data("val");
                if (key) {
                    var range = ageRangeValide[key];
                    var year = getDiffYear();
                    var r1 = range[0] - range[2];
                    var r2 = range[1] + range[3];
                    if ((year > r1 && year <= range[0]) || (year > range[1] && year <= r2)) {

                        //提示不在正常的上学年龄,您需要确定吗?
                        result = confirm("您选择的年龄不是正常的上学年龄范围,是否继续?");
                    } else if (year < r1 || year > r2) {
                        //提示不能选择该年龄段
                        var tips = "该上学阶段的年龄范围至少应该在:" + (range[0] - range[2]) + "到" + (range[1] + range[3]) + "周岁之间,请重新选择出生日期,如果仍要继续,请点击确定";
                        result = confirm(tips);

                        // wrap.find("select[name='sxjb']").testRemind("该上学阶段的年龄范围至少应该在:" + (range[0] - range[2]) + "到" + (range[1] + range[3]) + "周岁之间,请重新选择出生日期");
                        // // $("#form-submit").attr("disabled", true);
                        // result = false;
                    } else {
                        // $("#form-submit").attr("disabled", false);
                        result = true;
                    }
                } else {
                    alert("提示：请根据出生日期选择正确的教育阶段");
                    result = false;

                    // $("input[name='sxlx']").testRemind("请根据出生日期选择正确的教育阶段");
                    // result = false;
                }

            }

        }
        return result;
    }

    /**
     * 新生儿疾病筛查结果
     */
    function validateXsrjbsxjg() {
        var result = true;
        var val = $("input[name='xsrjbsxjg']:checked").val();
        if (val == "有先天性疾病") {

            var v1 = $("input[name='xsrjbsxjgBbtnz']:checked").val();
            var v2 = $("input[name='xsrjbsxjgJzxgnd']:checked").val();
            var v3 = $("input[name='xsrjbsxjgCdb']:checked").val();
            var v4 = $("input[name='xsrjbsxjgOther']").val();

            if (!v1 || !v2 || !v3) {
                $("#xsrjbsxjg-ext").testRemind("请选择 筛选出来的先天性疾病情况");
                result = false;
            } else if ((v1 == '否' && v2 == '否' && v3 == '否') && !v4) {
                $("#xsrjbsxjg-ext").testRemind("请填写 筛选出来的先天性疾病");
                result = false;
            }
        }
        return result;
    }


    /**
     * 是否服用营养补充品:
     */
    function validateSffyyybp() {
        var result = true;
        var val = $("input[name='sffyyybp']:checked").val();
        if (val == "是") {
            var v = $("input[name='yybpjtWssa']:checked").val();
            var v1 = $("input[name='yybpjtWssd']:checked").val();
            var v2 = $("input[name='yybpjtWssad']:checked").val();
            var v3 = $("input[name='yybpjtTj']:checked").val();
            var v4 = $("input[name='yybpjtDha']:checked").val();
            var v5 = $("input[name='yybpjtGj']:checked").val();
            var v6 = $("input[name='yybpjtOther']").val();

            if ((v == '否' && v1 == '否' && v2 == '否' && v3 == '否' && v4 == '否' && v5 == '否') && !v6) {

                $("input[name='yybpjtOther']").testRemind("请填写 具体的营养品名称");
                result = false;
            }
        }

        return result;
    }

    //过敏史
    function validateYgms() {
        var result = true;
        var val = $("input[name='ygms']:checked").val();
        if (val == "是") {
            var v = $("input[name='ygmsNiunai']:checked").val();
            var v1 = $("input[name='ygmsJidan']:checked").val();
            var v2 = $("input[name='ygmsHuafen']:checked").val();
            var v3 = $("input[name='ygmsHaixian']:checked").val();
            var v4 = $("input[name='ygmsYaowu']:checked").val();
            var v5 = $("input[name='ygmsOther']").val();
            if (!v || !v1 || !v2 || !v3 || !v4) {
                $("#ygms-ext").testRemind("请选择 过敏史情况");
                result = false;
            } else if ((v == '否' && v1 == '否' && v2 == '否' && v3 == '否' && v4 == '否') && !v5) {

                $("input[name='ygmsOther']").testRemind("请填写 具体的过敏史名称");
                result = false;
            }
        }

        return result;
    }

    //孩子的疾病史
    function validateHzjb() {
        var result = true;
        var v = $("input[name='hzjbsXtxxz']:checked").val();
        var v1 = $("input[name='hzjbsXtycdx']:checked").val();
        var v2 = $("input[name='hzjbsGdjb']:checked").val();
        var v3 = $("input[name='hzjbsJmxszb']:checked").val();
        var v4 = $("input[name='hzjbsGmxzd']:checked").val();
        var v5 = $("input[name='hzjbsDnb']:checked").val();
        var v6 = $("input[name='hzjbsJzxjb']:checked").val();
        var v7 = $("input[name='hzjbsLfsxgjy']:checked").val();
        var v8 = $("input[name='hzjbsXtxhlc']:checked").val();
        var v9 = $("input[name='hzjbsXc']:checked").val();
        var v10 = $("input[name='hzjbsPx']:checked").val();
        var v11 = $("input[name='hzjbsBxb']:checked").val();
        var v12 = $("input[name='hzjbsXxbyc']:checked").val();
        var v13 = $("input[name='hzjbsDx']:checked").val();
        var v14 = $("input[name='hzjbsNy']:checked").val();
        var v15 = $("input[name='hzjbsNmy']:checked").val();
        var v16 = $("input[name='hzjbsCsxgz']:checked").val();
        var v17 = $("input[name='hzjbsExzl']:checked").val();
        var v18 = $("input[name='hzjbsFfhxdgr']:checked").val();
        var v19 = $("input[name='hzjbsOther']").val();
        if ((v == '否' && v1 == '否'
            && v2 == '否'
            && v3 == '否'
            && v4 == '否'
            && v5 == '否'
            && v6 == '否'
            && v7 == '否'
            && v8 == '否'
            && v9 == '否'
            && v10 == '否'
            && v11 == '否'
            && v12 == '否'
            && v13 == '否'
            && v14 == '否'
            && v15 == '否'
            && v16 == '否'
            && v17 == '否'
            && v18 == '否') && !v19) {

            $("#hzjb-wrap").testRemind("请填写 具体的疾病史名称");
            result = false;
        }

        return result;
    }

    //辅食
    function validateSftjfs() {
        var result = true;
        var val = $("input[name='sftjfs']:checked").val();
        if (val == "是") {
            var v = $("input[name='tjfsMimian']:checked").val();
            var v1 = $("input[name='tjfsDan']:checked").val();
            var v2 = $("input[name='tjfsRou']:checked").val();
            var v3 = $("input[name='tjfsShuigu']:checked").val();
            var v4 = $("input[name='tjfsShucai']:checked").val();
            var v5 = $("input[name='tjfsOther']").val();
            if (!v || !v1 || !v2 || !v3 || !v4) {
                $("#sftjfs-ext").testRemind("请选择 添加的辅食情况");
                result = false;
            } else if ((v == '否' && v1 == '否' && v2 == '否' && v3 == '否' && v4 == '否') && !v5) {
                $("input[name='tjfsOther']").testRemind("请填写 具体已添加的辅食");
                result = false;
            }

            if (v == '是' && !$("input[name='tjfsMimianTime']").val()) {
                $("input[name='tjfsMimianTime']").testRemind("请填写添加米面辅食的时间");
                result = false;
            }

            if (v1 == '是' && !$("input[name='tjfsDanTime']").val()) {
                $("input[name='tjfsDanTime']").testRemind("请填写添加蛋类辅食的时间");
                result = false;
            }

            if (v2 == '是' && !$("input[name='tjfsRouTime']").val()) {
                $("input[name='tjfsRouTime']").testRemind("请填写添加肉类辅食的时间");
                result = false;
            }

            if (v3 == '是' && !$("input[name='tjfsShuiguTime']").val()) {
                $("input[name='tjfsShuiguTime']").testRemind("请填写添加水果辅食的时间");
                result = false;
            }

            if (v4 == '是' && !$("input[name='tjfsShucaiTime']").val()) {
                $("input[name='tjfsShucaiTime']").testRemind("请填写添加蔬菜辅食的时间");
                result = false;
            }

            if (v5 && !$("input[name='tjfsOtherTime']").val()) {
                $("input[name='tjfsOtherTime']").testRemind("请填写添加其他辅食的时间");
                result = false;
            }

        }
        return result;
    }

//黄疸
    function validateHuangdan() {
        var result = true;
        var val = $("input[name='huangdan']:checked").val();
        var v = $("input[name='huangdanpYes']:checked").val();
        if (val == "有" && !$.trim(v)) {
            $("#huangdan-ext").testRemind("请选择黄疸部位");
        }
        return result;
    }

    function validateShizhen() {
        var result = true;
        var val = $("input[name='shizhen']:checked").val();
        var v = $("input[name='shizhenzYes']:checked").val();
        if (val == "有" && !$.trim(v)) {
            $("#shizhen-ext").testRemind("请选择湿疹部位");
        }
        return result;
    }
    function validateDownload() {
        var result = true;
        if ($("input[name='file-name']:checked").length < 1) {
            $("#dowload-file").testRemind("至少选择1项");
            result = false;
        }
        return result;
    }

    $.testRemind.css = {
        maxWidth: 280,
        backgroundColor: "#FFFFE0",
        borderColor: "#bb0d0d",
        color: "#333",
        fontSize: "18px"
    };

    $("#form").html5Validate(function () {
        // 全部验证通过，该干嘛干嘛~~
        this.submit();
    }, {
        // novalidate: false,
        labelDrive: true,
        validate: function () {
             var r = true;
            
        	 r=validateLevel(this)
             && validateXsrjbsxjg()
             && validateSffyyybp()
             && validateSftjfs()
             && validateYgms()
             && validateShizhen()
             && validateHuangdan();
            // && validateDownload();
            return r;
            // r = validateHzjb();
        }

    });
});
