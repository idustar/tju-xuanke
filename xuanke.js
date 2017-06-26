/**
 * Created by dustar on 2017/6/26.
 */

'use strict';

var selected = [];
var isqk = false;
var interval = 3000;
var selected_count = 0;
var success_count = 0;
var qk_count = 0;
var s = document.createElement("script");
s.setAttribute("src","https://cdn.bootcss.com/cookie.js/1.2.2/cookie.min.js");
$('#savetable-btn').before('<input type="button" name="button" id="qk-btn" onclick="saveList()" value="存档">' +
    '<input type="button" name="button" id="qk-btn" onclick="loadList()" value="读档">' +
    '<input type="button" name="button" id="qk-btn" onclick="addToqk()" value="加入抢课列表">');
$('#courseTable').after('<div id="qk-list-bar">抢课列表<table class="data-table" id="qk-list"><thead><tr><th>课程名称</th><th>教师</th><th>上课时间</th><th>状态</th><th>操作面板</th></tr></thead></table></div>')
$('#notice').remove();
$('#op-area').before('<div id="qk-bar"><span>DuStark 抢课脚本 </span><input type="button" name="button" id="qk-btn" onclick="changeqk()" value="开始抢课">' +
    ' <span>抢课间隔：</span><input type="number" name="qk-interval" id="qk-interval" value="3000"> <span>' +
    '当前已尝试抢课<span id="qk_count">0</span>次,已抢到<span id="success_count" style="color:green">' +
    '0</span>/<span id="selected_count">0</span>节课。最新：<span id="newest" style="color:red">DuStark 抢课加载完毕。</span></span></div>');
s.onload = function(){

    // for(var i=0;i<100;i++){
    //     setTimeout(function(){
    //         $('a[action-type="fl_menu"]')[0].click();
    //         $('a[title="删除此条微博"]')[0].click();
    //         $('a[action-type="ok"]')[0].click();
    //     },1000*i);
    // }
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
            alert("已将" + lessonname + "下的课程" + classnumber + "(" + teachername + ")加入抢课列表。\n" + classtime);
            selected.push({
                "lessonid": lessonid,
                "classid": classid,
                "lessonname": lessonname,
                "classnumber": classnumber,
                "teachername": teachername,
                "classtime": classtime,
                "state": "正在抢课"
            });
            selected_count++;
            $('#selected_count').text(selected_count);
            refreshList();
        } else {
            console.log(lessonname + "下的课程" + classnumber + "(" + teachername + ")添加失败。已经选课成功。");
            alert(lessonname + "下的课程" + classnumber + "(" + teachername + ")添加失败。已经选课成功。");
        }
    } else {
        alert("没有选中任何目标课程。");
    }
}

function refreshList() {
    $('#qk-list').html("<thead><tr><th>课程名称</th><th>教师</th><th>上课时间</th><th>状态</th><th>操作面板</th></tr></thead>");
    for (var i in selected) {
        var l = selected[i];
        var s = "<tr class='"+(l['state']==="正在抢课"?"":"red")+"'><td>"+l['lessonname']+"</td><td>"+l['teachername']+"</td>" +
            "<td>"+l['classtime']+"</td><td>"+l['state']+"</td><td><a href='javascript:' onclick='cancelqk("+i+")'>取消抢课</a></td></tr>"
        $('#qk-list').append(s);
    }
}

function changeqk() {
    if (isqk) {
        isqk = false;
        $('#qk-btn').val("开始抢课");
        console.log("暂停抢课。");
        $('#qk-interval').attr("disabled", false);

    } else {
        isqk = true;
        $('#qk-btn').val("停止抢课");
        interval = $('#qk-interval').val();
        console.log("开始抢课。");
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
        $('#qk-interval').attr("disabled", false);
        return;
    }

    qk_count++;
    console.log("尝试第"+qk_count+"次抢课。");
    var newevent = false;
    var newclass = false;

    $('#qk_count').text(qk_count);
    for (var i in selected) {
        var l = selected[i];
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
            window.electCourseTable.showLessonOnTable(l["classid"],true);
            newclass = true;
        }
    }
    if (newclass)
        $('#savetable-btn').click();
    if (newevent) refreshList();
    setTimeout(function () {
        $('#cboxClose').click();
        setTimeout(qk, interval/2)
    }, interval/2);
    return;
}

function saveList(){
    var str = JSON.stringify(selected);
    console.log(str);
    setCookie('selected', str);
    setCookie('interval', interval);
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
            arr.splice(i,1);
            flag = false;
            continue;
        }
        window.teachClassTable.refresh(l["lessonid"]);
        if ($('#'+l["classid"]).hasClass("red")) {
            arr.splice(i,1);
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