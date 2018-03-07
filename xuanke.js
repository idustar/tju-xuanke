/**
 * Created by dustar on 2017/6/26.
 */

'use strict';

var selected = [];
var lessons = {};
var isRob = false;
var interval = 3000;
var selected_count = 0;
var success_count = 0;
var rob_count = 0;
window.alert = function () {
}

var s = document.createElement("script");
$('html').css("font-family", 'PingFang SC', "微软雅黑");
$('#plancourse-btn').after('<input type="button" name="button" id="list-btn" onclick="refreshList()" value="抢课列表">');
$('#savetable-btn').before('<input type="button" name="button" id="rob-btn" onclick="addToSelectList()" value="加入抢课列表">');
$('#notice').remove();
$('#op-area').before('<div id="rob-bar"><span>DuStark 抢课脚本 v2.0</span><input type="button" name="button" ' +
    'class="rob-btn" id="rb" onclick="changeRobState()" value="开始抢课">' +
    ' <span>抢课间隔：</span><input type="number" name="rob-interval" id="rob-interval" value="3000"> <span>' +
    '当前已尝试抢课<span class="rob_count">0</span>次,已抢到<span class="success_count" style="color:green">' +
    '0</span>/<span class="selected_count">0</span>节课。最新：<span class="newest" style="color:red">DuStark 抢课加载完毕。</span></span></div>');
s.onload = function () {
}
document.head.appendChild(s);

function sort() {
    selected = selected.sort(function (a, b) {
        return a.pre > b.pre;
    })
}

function checkAvailable () {
    for (var i = 0; i < selected.length; i++) {
        for (var j = i + 1; j < selected.length; j++) {
            if (selected[i].pre === selected[j].pre && selected[i].courseId === selected[j].courseId) {
                confirm('设置不正确，同一课名下的课程应设置不同序列号，否则将导致其中一项失效。请修改"' + selected[i].lessonName
                + '"课名下不同课程的序列号！');
                return false;
            }
        }
    }
    return true;
}

function changePreData() {
    for (var i = 0; i < selected.length; i++) {
        selected[i]["pre"] = parseInt($('#pre-' + selected[i]["lessonId"]).val());
    }
    for (var i = 0; i < selected.length; i++) {
        if (lessons[selected[i]["pre"]]) {
            lessons[selected[i]["pre"]].push(selected[i])
        }
        else {
            lessons[selected[i]["pre"]] = [selected[i]]
        }
    }
}

function addToSelectList() {
    if ($('#teachClass .lessonAtRightAndLeft')[0]) {
        // var lesson = $('.lessonAtRightAndLeft')[0];
        const lessonDom = $('#teachClass .lessonAtRightAndLeft')[0];
        // var mclass = $('.lessonAtRightAndLeft')[1];
        const lessonId = parseInt($(lessonDom).attr("id"), 10);
        const lesson = window.electCourseTable.lessons({id: lessonId}).first();
        if (!lesson) {
            confirm("没有选中任何目标课程。");
            return;
        }
        const lessonNo = lesson.no;
        const courseId = lessonNo.substr(0, 6);
        const course = window.planCourseTable.showCourses({code: courseId}).first();
        if (!course) {
            confirm("系统错误。");
            return;
        }
        const lessonName = lesson.name;
        const teacherName = lesson.teachers;
        var classTime = $($(lessonDom).children("td")[5]).html();
        var isSelected = course.state === 'ELE';

        if (!isSelected) {
            console.log("已将" + lessonName + "下的课程" + lessonNo + "(" + teacherName + ")加入抢课列表。\n" + classTime);
            confirm("已将" + lessonName + "下的课程" + lessonNo + "(" + teacherName + ")加入抢课列表。\n" + classTime);
            selected.push({
                "courseId": courseId,
                "lessonId": lessonId,
                "lessonName": lessonName,
                "lessonNo": lessonNo,
                "teacherName": teacherName,
                "classTime": classTime,
                "state": "正在抢课",
                "pre": 0
            });
            selected_count++;
            $('.selected_count').text(selected_count);
            window.electCourseTable.showLessonOnTable(null, false);
            //refreshList();
        } else {
            console.log(lessonName + "下的课程" + lessonNo + "(" + teacherName + ")添加失败。已经选课成功。");
            confirm(lessonName + "下的课程" + lessonNo + "(" + teacherName + ")添加失败。已经选课成功。");
        }
    } else {
        confirm("没有选中任何目标课程。");
    }
}

function refreshList() {
    sort();
    jQuery.colorbox({
        transition: 'none',
        height: "60%",
        width: "800px",
        inline: true,
        href: "#rob-list-outer",
        title: '抢课列表'
    });
    $('#cboxLoadedContent').html('<div style="height: 25px;">' +
        '<input type="button" name="button" id="save-btn" onclick="saveList()" value="存档">&nbsp;' +
        '<input type="button" name="button" id="load-btn" onclick="loadList()" value="读档">&nbsp;' +
        '<input type="button" name="button" class="rob-btn" onclick="changeRobState()" value="开始/停止"></div>' +
        '<div id="rob-list-outer"><table class="data-table" id="rob-list"></table></div><div id="rob-message"></div>')
    $('#rob-list').html("<thead><tr><th>课程名称</th><th>教师</th><th>上课时间</th><th>状态</th><th>操作面板</th></tr></thead>");
    for (var i in selected) {
        var l = selected[i];
        var s = "<tr class='" + (l['state'] === "正在抢课" ? "" : "red") + "'><td>" + l['lessonName'] + "</td><td>" + l['teacherName'] + "</td>" +
            "<td>" + l['classTime'] + "</td><td>" + l['state'] + "</td><td><a href='javascript:' onclick='cancelRob(" + i + ")'>取消抢课</a> " +
            "<div> 序列:<input type='number' onchange='changePreData()' " +
            "style='width:30px' class='pre' id='pre-" + selected[i]["lessonId"] + "' value='" + selected[i]["pre"] + "'></div></td></tr>"
        $('#rob-list').append(s);
    }
}

function changeRobState() {
    if (isRob) {
        isRob = false;
        window.electCourseTable.showLessonOnTable(null, true);
        $('.rob-btn').val("开始抢课");
        console.log("暂停抢课。");
        $('#rob-interval').attr("disabled", false);
        $('.pre').attr("disabled", false);
    } else {
        if (!checkAvailable()) return;
        isRob = true;
        $('.rob-btn').val("停止抢课");
        interval = $('#rob-interval').val();
        console.log("开始抢课。");
        lessons = {};
        $('.pre').attr("disabled", true);
        changePreData();
        rob();
        $('#rob-interval').attr("disabled", true);
    }
}

function cancelRob(i) {
    console.log("已将选课任务" + selected[i]["lessonName"] + "-" + selected[i]["teacherName"] + "移出选课列表。");
    if (selected[i]["state"] !== "正在抢课") success_count--;
    selected.splice(i, 1);
    selected_count--;
    $('.selected_count').text(selected_count);
    $('.success_count').text(success_count);
    refreshList();
}

function rob() {
    if (!isRob) return;
    checkNewEvent();
    if (selected_count === success_count) {
        isRob = false;
        $('.rob-btn').val("开始抢课");
        console.log("恭喜，全部课程抢课成功，系统自动停止抢课！");
        $('.newest').text("恭喜，全部课程抢课成功，系统自动停止抢课！");
        $('#rob-interval').attr("disabled", false);
        $('.pre').attr("disabled", false);
        return;
    }

    var lessons_count = Object.keys(lessons).length;
    if (lessons[0] && lessons[0].length > 0) lessons_count--;
    //console.log("count:"+lessons_count);
    var subinterval = interval / ((lessons_count > 0) ? lessons_count : 1);
    rob_count++;
    console.log("正在进行第" + rob_count + "次抢课尝试。");


    $('.rob_count').text(rob_count);

    var timeout = -subinterval;
    if (lessons_count === 0) {
        doRob(0, interval);
    } else {
        for (var pre in lessons) {
            if (pre != 0) {
                setRob(pre, subinterval, timeout = timeout + subinterval)
            }
        }
    }
    setTimeout(rob, interval);
    return;
}

function setRob(pre, subinterval, timeout) {
    setTimeout(function () {
        doRob(pre, subinterval)
    }, timeout);
}

function doRob(pre, subinterval) {
    var that = this;
    window.electCourseTable.showLessonOnTable(null, false);
    var newClass = false;
    if (pre !== 0) {
        var s = lessons[pre];
        for (var i in s) {
            var l = s[i];
            if (l["state"] !== "正在抢课") continue;
            window.electCourseTable.showLessonOnTable(parseInt(l["lessonId"]), true);
            newClass = true;
        }
    }
    if (lessons[0]) {
        s = lessons[0];
        for (var i in s) {
            var l = s[i];
            if (l["state"] !== "正在抢课") continue;
            window.electCourseTable.showLessonOnTable(parseInt(l["lessonId"]), true);
            newClass = true;
        }
    }
    if (newClass) {
        setTimeout(function () {
            //$('#savetable-btn').click();
            sendSaveRequest(pre);
        }, subinterval / 4);
    }
}

function checkNewEvent () {
    var newEvent = false;
    for (var i in selected) {
        const l = selected[i];
        if (l.state !== "正在抢课") continue;
        const course = window.planCourseTable.showCourses({lessonId: l.lessonId}).first();
        if (course && course.state === 'ELE') {
            selected[i].state = "已抢到 " + new Date().toLocaleTimeString();
            newEvent = true;
            console.log(l['lessonName'] + '-' + l['teacherName'] + "选课成功。");
            success_count++;
            $('.success_count').text(success_count);
            $('.newest').text(l['lessonName'] + '-' + l['teacherName'] + "选课成功。");
        }
    }
    if (newEvent)
        refreshList();
}

function saveList() {
    var str = JSON.stringify(selected);
    setCookie('selected', str);
    setCookie('interval', interval);
    confirm("存档成功。");
}

function loadList() {
    selected = JSON.parse(getCookie('selected'))
    if (!Array.isArray(selected)) {
        confirm('找不到档案，请先在本机存档');
        return;
    }
    for (var i = 0, flag = true, len = selected.length; i < len; flag ? i++ : i) {
        if (!selected[i]) {
            flag = true;
            continue;
        }
        var l = selected[i];
        if (l["state"] !== "正在抢课") {
            selected.splice(i, 1);
            flag = false;
            continue;
        }
        window.teachClassTable.refresh(l["courseId"]);
        if ($('#' + l["lessonId"]).hasClass("red")) {
            selected.splice(i, 1);
            flag = false;
            continue;
        }
        flag = true;
    }
    selected_count = selected.length;
    success_count = 0;
    interval = getCookie('interval');
    refreshList();
    $('.selected_count').text(selected_count);
    $('.success_count').text(success_count);
}

function setCookie(name, value) {
    var Days = 30;
    var exp = new Date();
    exp.setTime(exp.getTime() + Days * 24 * 60 * 60 * 1000);
    document.cookie = name + "=" + escape(value) + ";expires=" + exp.toGMTString();
}

function getCookie(name) {
    var arr, reg = new RegExp("(^| )" + name + "=([^;]*)(;|$)");
    if (arr = document.cookie.match(reg))
        return unescape(arr[2]);
    else
        return null;
}

function sendSaveRequest(pre) {
    $('#rob-message').html('<div>等待序列' + pre + '返回抢课结果。</div>');
    //alert(electCart.operations)
    for (var i = 0; i < electCart.operations.length; i++) {
        var lessonId = electCart.operations[i][0]
        if (window.electCourseTable.lessons({id: lessonId}, {elected: true}).count() > 0) {
            electCart.operations.splice(i, 1)
            i--;

        }
    }

//		if (electCart.operations.length ==0){alert("你没有要保存的数据！");return;}
    if (null == language || undefined == language || "" == language || "zh" == language) {
        if (electCart.operations.length == 0) {
            alert("你没有要保存的数据！");
            return;
        }
    } else {
        if (electCart.operations.length == 0) {
            alert("You don't have data to save！");
            return;
        }
    }
    window.electCourseTable.showLessonOnTable(null, true);
    //if(planCourseTable.conflictlessons.length>0){alert("有冲突课程，请检查！");return;}


    var electLessonIds = "";
    var withdrawLessonIds = "";
    var exchangeLessonPairs = "";
    for (var i = 0; i < electCart.operations.length; i++) {
        var op = electCart.operations[i];
        if (op[1] == true) {
            electLessonIds += op[0] + ",";
        } else if (op[1] == false) {
            withdrawLessonIds += op[0] + ",";
        } else if (op[2] == 'ex') {
            // 原lessonId-新lessonId
            exchangeLessonPairs += op[0] + '-' + op[1] + ',';
        }
    }
    if (!window.planCourseTable.engCheck(electLessonIds, withdrawLessonIds)) {
        return;
    }
    setTimeout("electCart.clear()",700);
    $.get(electCourseTable.config.base
        + "/tJStdElectCourse!batchOperator.action?"
        + "electLessonIds=" + encodeURIComponent(electLessonIds)
        + "&withdrawLessonIds=" + encodeURIComponent(withdrawLessonIds)
        + "&exchangeLessonPairs=" + encodeURIComponent(exchangeLessonPairs), function(res) {
        $('#rob-message').html('<div>序列' + pre + '处理完成: </div>' + res);
        checkNewEvent();
    });

};
