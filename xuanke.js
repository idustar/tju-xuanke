/**
 * Created by dustar on 2017/6/26.
 */

'use strict';

var selected = [];
var lessons = {};
var isqk = false;
var interval = 3000;
var selected_count = 0;
var success_count = 0;
var qk_count = 0;
window.alert = function(){}
var s = document.createElement("script");
$('html').css("font-family",'PingFang SC',"微软雅黑");
$('#plancourse-btn').after('<input type="button" name="button" id="qk-btn" onclick="saveList()" value="存档">' +
    '<input type="button" name="button" id="qk-btn" onclick="loadList()" value="读档">');
$('#savetable-btn').before('<input type="button" name="button" id="qk-btn" onclick="addToqk()" value="加入抢课列表">');
$('#courseTable').after('<div id="qk-list-bar">抢课列表<table class="data-table" id="qk-list"><thead><tr><th>课程名称</th><th>教师</th><th>上课时间</th><th>状态</th><th>操作面板</th></tr></thead></table></div>')
$('#notice').remove();
$('#op-area').before('<div id="qk-bar"><span>DuStark 抢课脚本 </span><input type="button" name="button" id="qk-btn" onclick="changeqk()" value="开始抢课">' +
    ' <span>抢课间隔：</span><input type="number" name="qk-interval" id="qk-interval" value="3000"> <span>' +
    '当前已尝试抢课<span id="qk_count">0</span>次,已抢到<span id="success_count" style="color:green">' +
    '0</span>/<span id="selected_count">0</span>节课。最新：<span id="newest" style="color:red">DuStark 抢课加载完毕。</span></span></div>');
s.onload = function(){
}
document.head.appendChild(s);

function addToqk() {
    if ($('.lessonAtRightAndLeft')[0] && $('.lessonAtRightAndLeft')[1]) {
        var lesson = $('.lessonAtRightAndLeft')[0];
        var mclass = $('.lessonAtRightAndLeft')[1];
        var lessonid = $(lesson).attr("id");
        var classid = $(mclass).attr("id");
        var lessonname = $($(lesson).children("td")[1]).html();
        var classnumber = $($(mclass).children("td")[0]).html();
        var teachername = $($(mclass).children("td")[1]).html();
        var classtime = $($(mclass).children("td")[5]).html();
        var isSelected = $(mclass).hasClass('red');

        if (!isSelected) {
            console.log("已将" + lessonname + "下的课程" + classnumber + "(" + teachername + ")加入抢课列表。\n" + classtime);
            confirm("已将" + lessonname + "下的课程" + classnumber + "(" + teachername + ")加入抢课列表。\n" + classtime);
            selected.push({
                "lessonid": lessonid,
                "classid": classid,
                "lessonname": lessonname,
                "classnumber": classnumber,
                "teachername": teachername,
                "classtime": classtime,
                "state": "正在抢课",
                "pre": 0
            });
            selected_count++;
            $('#selected_count').text(selected_count);
            refreshList();
        } else {
            console.log(lessonname + "下的课程" + classnumber + "(" + teachername + ")添加失败。已经选课成功。");
            confirm(lessonname + "下的课程" + classnumber + "(" + teachername + ")添加失败。已经选课成功。");
        }
    } else {
        confirm("没有选中任何目标课程。");
    }
}

function refreshList() {
    $('#qk-list').html("<thead><tr><th>课程名称</th><th>教师</th><th>上课时间</th><th>状态</th><th>操作面板</th></tr></thead>");
    for (var i in selected) {
        var l = selected[i];
        var s = "<tr class='"+(l['state']==="正在抢课"?"":"red")+"'><td>"+l['lessonname']+"</td><td>"+l['teachername']+"</td>" +
            "<td>"+l['classtime']+"</td><td>"+l['state']+"</td><td><a href='javascript:' onclick='cancelqk("+i+")'>取消抢课</a> " +
            "<span> 序列:</span><input style='width:30px' class='pre' id='pre-"+selected[i]["classnumber"]+"' value='"+selected[i]["pre"]+"'></td></tr>"
        $('#qk-list').append(s);
    }
}

function changeqk() {
    if (isqk) {
        isqk = false;
        $('#qk-btn').val("开始抢课");
        console.log("暂停抢课。");
        $('#qk-interval').attr("disabled", false);
        $('.pre').attr("disabled",false);

    } else {
        isqk = true;
        $('#qk-btn').val("停止抢课");
        interval = $('#qk-interval').val();
        console.log("开始抢课。");
        lessons = {};
        $('.pre').attr("disabled", true);
        for (var i = 0; i < selected.length; i++) {
            selected[i]["pre"] = parseInt($('#pre-'+selected[i]["classnumber"]).val());
        }
        for (var i = 0; i < selected.length; i++) {
            if (lessons[selected[i]["pre"]]) {
                lessons[selected[i]["pre"]].push(selected[i])
            }
            else {
                lessons[selected[i]["pre"]] = [selected[i]]
            }
        }
        qk();
        $('#qk-interval').attr("disabled", true);
    }
}

function cancelqk(i) {
    console.log("已将选课任务"+selected[i]["lessonname"]+"-"+selected[i]["teachername"]+"移出选课列表。");
    if (selected[i]["state"]!=="正在抢课") success_count--;
    selected.splice(i,1);
    selected_count--;
    $('#selected_count').text(selected_count);
    $('#success_count').text(success_count);
    refreshList();
}

function qk() {
    if (!isqk) return;

    if (selected_count === success_count) {
        isqk = false;
        $('#qk-btn').val("开始抢课");
        console.log("恭喜，全部课程抢课成功，系统自动停止抢课！");
        $('#newest').text("恭喜，全部课程抢课成功，系统自动停止抢课！");
        $('#qk-interval').attr("disabled", false);
        $('.pre').attr("disabled",false);
        return;
    }

    var lessons_count = Object.keys(lessons).length;
    if (lessons[0] && lessons[0].length>0) lessons_count--;
    //console.log("count:"+lessons_count);
    var subinterval = interval / ((lessons_count>0)?lessons_count:1);
    qk_count++;
    console.log("正在进行第"+qk_count+"次抢课尝试。");


    $('#qk_count').text(qk_count);

    var timeout = -subinterval;
    if (lessons_count === 0){
        qking(0, interval);
    } else {
        for (var pre in lessons) {
            if (pre != 0) {
                setqk(pre, subinterval, timeout = timeout + subinterval)
            }
        }
    }
    setTimeout(qk, interval);
    return;
}

function setqk(pre, subinterval, timeout) {
    setTimeout(function () {
        qking(pre, subinterval)
    }, timeout);
}

function qking(pre, subinterval) {
    var newevent = false;
    var newclass = false;
    if (pre !== 0) {
        var s = lessons[pre];
        for (var i in s) {
            var l = s[i];
            if (l["state"] !== "正在抢课") continue;
            window.teachClassTable.refresh(l["lessonid"]);
            if ($('#' + l["classid"]).hasClass("red")) {
                selected[i]["state"] = "已抢到 " + new Date().toLocaleTimeString();
                newevent = true;
                console.log(l['lessonname'] + '-' + l['teachername'] + "选课成功。");
                success_count++;
                $('#success_count').text(success_count);
                $('#newest').text(l['lessonname'] + '-' + l['teachername'] + "选课成功。");
            } else {
                window.electCourseTable.showLessonOnTable(parseInt(l["classid"]), true);
                newclass = true;
            }
        }
    }
    if (lessons[0]) {
        s = lessons[0];
        for (var i in s) {
            var l = s[i];
            if (l["state"]!=="正在抢课") continue;
            window.teachClassTable.refresh(l["lessonid"]);
            if ($('#'+l["classid"]).hasClass("red")) {
                selected[i]["state"] = "已抢到 "+new Date().toLocaleTimeString();
                newevent = true;
                console.log(l['lessonname']+'-'+l['teachername']+"选课成功。");
                success_count++;
                $('#success_count').text(success_count);
                $('#newest').text(l['lessonname']+'-'+l['teachername']+"选课成功。");
            } else {
                window.electCourseTable.showLessonOnTable(parseInt(l["classid"]),true);
                newclass = true;
            }
        }
    }
    if (newclass) {
        setTimeout(function () {
            $('#savetable-btn').click();
        }, subinterval / 4);

        setTimeout(function () {
            $('#cboxClose').click();
        }, subinterval / 2);
    }
    if (newevent)
        refreshList();
    return newevent;
}

function saveList(){
    var str = JSON.stringify(selected);
    console.log(str);
    setCookie('selected', str);
    setCookie('interval', interval);
    confirm("存档成功。");
}

function loadList() {
    selected = JSON.parse(getCookie('selected'))
    for(var i=0,flag=true,len=selected.length;i<len;flag ? i++ : i){
        if (!selected[i]) {
            flag = true;
            continue;
        }
        var l = selected[i];
        if (l["state"]!=="正在抢课") {
            selected[i].splice(i,1);
            flag = false;
            continue;
        }
        window.teachClassTable.refresh(l["lessonid"]);
        if ($('#'+l["classid"]).hasClass("red")) {
            selected[i].splice(i,1);
            flag = false;
            continue;
        }
        flag = true;
    }
    selected_count = selected.length;
    success_count = 0;
    interval = getCookie('interval');
    refreshList();
    $('#selected_count').text(selected_count);
    $('#success_count').text(success_count);
}

function setCookie(name,value)
{
    var Days = 30;
    var exp = new Date();
    exp.setTime(exp.getTime() + Days*24*60*60*1000);
    document.cookie = name + "="+ escape (value) + ";expires=" + exp.toGMTString();
}

function getCookie(name)
{
    var arr,reg=new RegExp("(^| )"+name+"=([^;]*)(;|$)");
    if(arr=document.cookie.match(reg))
        return unescape(arr[2]);
    else
        return null;
}
