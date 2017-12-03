/**
 * Created by dustar on 2017/6/26.
 */
jQuery(document).ready(function(){


    window.isValidOdd = function(weekState) {
        if (null == weekState || undefined == weekState || "" == weekState.replace(new RegExp(" ", "gm"), "")) {
            return false;
        }

        var firstIndex = -1;
        var zeroCount = 0;
        for (var i = 0; i < weekState.length; i++) {
            if (weekState.charAt(i) == '1') {
                if (0 != zeroCount) {
                    if (1 == zeroCount) {
                        zeroCount = 0;
                    } else {
                        return false;
                    }
                }
                if (0 == i % 2) {
                    return false;
                }
                if (firstIndex < 0) {
                    firstIndex = i;
                }
            } else {
                if (0 == zeroCount && firstIndex >= 0 && 1 == i % 2) {
                    return false;
                }
                if (firstIndex >= 0) {
                    zeroCount++;
                }
            }
        }
        return true;
    }

    window.isValidEven = function(weekState) {
        if (null == weekState || undefined == weekState || "" == weekState.replace(new RegExp(" ", "gm"), "")) {
            return false;
        }

        var firstIndex = -1;
        var zeroCount = 0;
        for (var i = 0; i < weekState.length; i++) {
            if (weekState.charAt(i) == '1') {
                if (0 != zeroCount) {
                    if (1 == zeroCount) {
                        zeroCount = 0;
                    } else {
                        return false;
                    }
                }
                if (1 == i % 2) {
                    return false;
                }
                if (firstIndex < 0) {
                    firstIndex = i;
                }
            } else {
                if (0 == zeroCount && firstIndex >= 0 && 0 == i % 2) {
                    return false;
                }
                if (firstIndex >= 0) {
                    zeroCount++;
                }
            }
        }
        return true;
    }

    window.weekStateContent = function(weekState, firstWeek) {
        if (null == weekState || undefined == weekState || "" == weekState.replace(new RegExp(" ", "gm"), "") || null == firstWeek || undefined == firstWeek || "" == firstWeek) {
            return {"beginWeek":"?", "endWeek":"?"};
        }

        var beginIndex = -1;
        var endIndex = -1;
        for (var i = firstWeek; i < weekState.length; i++) {
            if (weekState.charAt(i) == '1') {
                if (beginIndex < 0) {
                    if (i == firstWeek) {
                        beginIndex = i - firstWeek + 1;
                    } else {
                        beginIndex = i - firstWeek + 2;
                    }
                }
                endIndex = i - firstWeek + 2;
            }
        }
        return {"beginWeek":beginIndex, "endWeek":endIndex};
    }

    function ElectCourseTable(option){
        this.config = {
            time				: 30000,//同步当前人数时间间隔 30s
            base				: option.base,
            weekDays			: [],
            checkTimeConflict	: false
        };
        //分页信息
        this.pageLimit = {
            ELECTION:{pageNo: 1, pageSize: 20},
            WITHDRAW:{pageNo: 1, pageSize: 20}
        }
        // 排序信息
        this.orderBy = {key:"",desc:false};
        // 筛选信息
        this.filters = [];
        // 可选课程查询栏里的查询条件
        this.conditions = [];
        //课表
        this.table = jQuery(option.table);

        //所有课程列表
        this.electableLessonList = jQuery(option.electableLessonList);
        this.electedLessonList = jQuery(option.electedLessonList);

        //教学任务数据
        this.lessons = TAFFY();
    }

    /**************************************************
     * 培养计划相关功能
     **************************************************/

    //初始化函数
    ElectCourseTable.prototype.init = function(conditions,reInit,callback){
        var lessonQuery = this.lessons();
        if(jQuery.isFunction(conditions)){
            callback = conditions;
        }else{
            if(conditions){
                if(!reInit){
                    this.filters = [
                        function(lesson){
                            if(lesson.elected==true || (conditions["courseTypeId"] || {})["c"+lesson.courseTypeId]) return true;
                            for(key in conditions){
                                if(key=="" || key=="courseTypeId") continue;
                                if(!(conditions[key] || {})["c"+lesson[key]]){
                                    return false;
                                }
                            }
                            return true;
                        }
                    ];
                }
            }
            lessonQuery = this.doFilter(lessonQuery);
        }
        var tip = this.tip;

        var electCells = jQuery(this.table).find("tbody tr td.electableCell");

        // 初始化 星期，小节 任务分布图
        var _lessons = lessonQuery.get();
        var _weekDayUnitMap = {};
        for(var w = 1; w <= 7; w++) {
            _weekDayUnitMap["" + w] = {};
            for(var u = 1; u <= 14; u++) {
                _weekDayUnitMap["" + w]["" + u] = [];
            }
        }
        for(var i = 0; i < _lessons.length; i++) {
            var _lesson = _lessons[i];
            for(var j = 0; j < _lesson.arrangeInfo.length; j++) {
                var _activity = _lesson.arrangeInfo[j];
                for(var k = _activity.startUnit; k <= _activity.endUnit; k++) {
                    var lessonInUnit = false;
                    var unitLessons = _weekDayUnitMap["" + _activity.weekDay]["" + k];
                    for(var z = 0; z < unitLessons.length; z++) {
                        if(unitLessons[z].id == _lesson.id) {
                            lessonInUnit = true;
                            break;
                        }
                    }
                    if(!lessonInUnit) {
                        unitLessons.push(_lesson);
                    }
                }
            }
        }
        // 初始化 星期，小节 任务分布图 完毕
        electCells.each(function(index){
            var cell = jQuery(this);
            var _weekDay = parseInt(cell.attr("weekDay"), 10);
            var _unit = parseInt(cell.attr("unit"), 10);
            electCourseTable.initCell(cell,_weekDayUnitMap);
        });
        this.initLessonList(lessonQuery);

        // 课程代码到任务的map
        this._code2Lessons = {};
        var that = this;
        // 初始化课程代码到任务的map
        this.lessons().each(function (l) {
            var _ls = that._code2Lessons[l.code];
            if(!_ls) {
                _ls = [];
                that._code2Lessons[l.code] = _ls;
            }
            _ls.push(l);
        });
    };


    // 返回新的lessonQuery
    ElectCourseTable.prototype.doFilter = function(lessonQuery,filters){
        lessonQuery = lessonQuery || this.lessons();
        filters = filters || this.filters;
        var cons = this.conditions;
        var newLessonQuery = lessonQuery;
        if(cons.length > 0) {
            for(var i = 0; i < cons.length; i++) {
                newLessonQuery = newLessonQuery.filter(cons[i]);
            }
        }
        if(filters.length > 0) {
            newLessonQuery = newLessonQuery.filter(function(){
                for(var i=0;i<filters.length;i++){
                    var result = filters[i](this);
                    if(!result){
                        return false;
                    }
                }
                return true;
            });
        }
        return newLessonQuery;
    };

    ElectCourseTable.prototype.isConflict = function(lesson,lesson2){
        /*if(!this.config.checkTimeConflict){
         return false;
         }*/
        //for (intplanCourseTable.hislearnedcourses.length

        var unitCount = this.config.checkTimeConflict.conflictTimeCount;
        var checkType = this.config.checkTimeConflict.checkType;
        var isContinuous = this.config.checkTimeConflict.isContinuous;

        var activities = lesson.arrangeInfo;
        var activities2 = lesson2.arrangeInfo;
        if(activities.length==0 || activities2.length==0){
            return false;
        }
        var allUnitCount=0; //总节次
        var conflictCount = 0;//冲突节次
        var maxConflict=0;//最大连续冲突节次
        var maxUnConflict=0;//最大连续空闲节次
        for(var i=0;i<activities.length;i++){
            var activity = activities[i];
            var weekState = activity.weekState;
            var timeStartUnit = activity.startUnit;
            var timeEndUnit = activity.endUnit;
            var oneDayUnit= timeEndUnit-timeStartUnit+1;
            var oneDayUnConfictCount = oneDayUnit;
            allUnitCount+=oneDayUnit;
            for(var j=0;j<activities2.length;j++){
                var activity2 = activities2[j];
                var weekState2 = activity2.weekState;
                var time2StartUnit = activity2.startUnit;
                var time2EndUnit = activity2.endUnit;
                for(var k=0;k<weekState.length;k++){
                    if(parseInt(parseInt(weekState[k], 10) & parseInt(weekState2[k], 10))>0 &&
                        activity.weekDay==activity2.weekDay){
                        if(timeStartUnit <= time2EndUnit && timeEndUnit >= time2StartUnit){
                            oneDayUnConfictCount=0;
                            if(unitCount==0 && checkType){
                                return true;
                            }else {
                                var minStart = Math.min(timeStartUnit, time2StartUnit);
                                var maxStart = Math.max(timeStartUnit, time2StartUnit);
                                var minEnd = Math.min(time2EndUnit, time2EndUnit);
                                var maxEnd = Math.max(time2EndUnit, time2EndUnit);
                                var oneDayConflictCount  = (minEnd - maxStart+1);
                                conflictCount+=oneDayConflictCount;
                                if(oneDayConflictCount>maxConflict) {
                                    maxConflict = oneDayConflictCount;
                                }
                                if(minStart==timeStartUnit){
                                    var leftOneDayUnConflictCount = (maxStart - minStart);
                                    if(!isContinuous || leftOneDayUnConflictCount>1){
                                        oneDayUnConfictCount += leftOneDayUnConflictCount;
                                    }
                                }
                                if(maxEnd==time2EndUnit){
                                    var rightOneDayUnConflictCount = (maxEnd - minEnd);
                                    if(!isContinuous || rightOneDayUnConflictCount>1){
                                        oneDayUnConfictCount += rightOneDayUnConflictCount;
                                    }
                                }
                                if(oneDayUnConfictCount>maxUnConflict) {
                                    maxUnConflict =oneDayUnConfictCount;
                                }
                            }
                        }
                    }
                }
            }
            if(oneDayUnConfictCount>maxUnConflict) {
                maxUnConflict =oneDayUnConfictCount;
            }
        }
        //检查冲突
        if(checkType){
            //冲突节次如果大于等于指定数量则冲突
            if(conflictCount >=unitCount && conflictCount>0){
                return true;
            }
        }else {
            //空闲节次如果大于等于指定数量则不冲突
            if(maxUnConflict>=unitCount && maxUnConflict>0){
                return !(unitCount>0);
            }else{
                return true;
            }
        }
        return false;
    }

    //检查冲突
    ElectCourseTable.prototype.checkConflict = function(lesson,checkCode){
        var conflictLessons = {
            lessons: {},
            each: function(callback){
                var i = 0;
                for(key in this.lessons){
                    callback(i,this.lessons[key]);
                    i++;
                }
            },
            length: 0,
            addLesson: function(lesson){
                if(!this.lessons["l"+lesson.id]){
                    this.lessons["l"+lesson.id] = lesson;
                    this.length++;
                }
            }
        };
        if(!electCourseTable.config.checkTimeConflict){
            if(checkCode){
                var _lessons = this._code2Lessons[lesson.code];
                for(var h = 0; h < _lessons.length; h++) {
                    if(_lessons.elected) {
                        conflictLessons.addLesson(_lessons[h]);
                    }
                }
            }else{
                return conflictLessons;
            }
        }else{
            var expr = {elected:true,id:{"!is":lesson.id}};
            this.lessons().filter(expr).each(function(lesson2, index){
                if(lesson2.code==lesson.code && checkCode){
                    conflictLessons.addLesson(lesson2);
                }else if(electCourseTable.isConflict(lesson,lesson2)){
                    conflictLessons.addLesson(lesson2);
                }
            });
        }
        return conflictLessons;
    };

    ElectCourseTable.prototype.queryStdCount = function(){
        var qrScript = jQuery("script#qr_script");
        var src = qrScript.attr("src");
        qrScript.remove();

        var body = document.getElementsByTagName("body")[0];
        var newScript = document.createElement('script');
        newScript.id = "qr_script";
        newScript.type = 'text/javascript';
        newScript.src = src;
        body.appendChild(newScript);
    }

    ElectCourseTable.prototype.isRetakeCourse = function(courseId){
        if(courseId){
            if(typeof this.config.hisCourses[courseId] != "undefined"){
                return true;
            }
            for(var i=0;i<this.config.courseSubstitutions.length;i++){
                var courseSubstitution = this.config.courseSubstitutions[i];
                if(typeof courseSubstitution.substitutes[courseId]!="undefined"){
                    for(hisCourseId in this.config.hisCourses){
                        if(typeof courseSubstitution.origins[hisCourseId] !="undefined"){
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    };

    // 初始化页面上的组件
    window.initDefaultPage = function(option)
    {
        window.electCourseTable = new ElectCourseTable(
            {
                base				: option.base,
                table				: jQuery("#courseTable table"),
                electableLessonList	: jQuery("#electableLessonList"),
                electedLessonList	: jQuery("#electedLessonList")
            }
        );
        var lessons = TAFFY(window.lessonJSONs);
        var takedLessonJSONs = eval(window.takedLessonsStr);

        for(var i = 0; i < takedLessonJSONs.length; i++) {
            if(lessons({id:takedLessonJSONs[i].id}).count() == 0 ) {
                lessons.insert(takedLessonJSONs[i]);
            }
        }
        //var _removedCount = lessons(function() { return !option.electableIds["l"+this.id]; }).remove();
        var _cc = lessonJSONs.length + takedLessonJSONs.length // - _removedCount;
        if(_cc < 0) {_cc = 0;}
        var lessonIds = new Array(_cc);

        window.electCourseTable.lessons = lessons;


        lessons().each(function(lessonArray, index) {
            var lessonId = lessonArray.id;
            var elected = option.electedIds["l"+lessonId]==true;
            var turn = option.electedTurns["l"+lessonId];
            var withdrawable = !option.unWithdrawableLessonIds["l"+lessonId] == true;
            lessons(lessonArray.___id).update({
                assign : (option.electableIds["l" + lessonId]=="assign"),
                elected : elected,
                turn   :   turn,
                defaultElected : elected,
                withdrawable : withdrawable
            });
            lessonIds.push(lessonArray.id);
        });

        window.electCourseTable.lessonIds = lessonIds.join(",");

        window.electCourseTable.config.profileId = option.profileId;
        window.electCourseTable.config.weekDays = option.weekDays;
        window.electCourseTable.config.checkTimeConflict = option.checkTimeConflict || false;
        window.electCourseTable.config.noRetake = option.noRetake;
        window.electCourseTable.config.hisCourses = option.hisCourses;
        window.electCourseTable.config.courseSubstitutions = option.courseSubstitutions;
        window.electCourseTable.config.batchOperator = option.batchOperator;
        window.electCourseTable.config.limitCheck = option.limitCheck;
        window.electCourseTable.config.hideWhenFull = option.hideWhenFull;
        window.electCourseTable.config.cannotRetakeTwice = option.cannotRetakeTwice;
        window.electCourseTable.config.cannotWithDrawThisTurn = option.cannotWithDrawThisTurn;
        window.electCourseTable.config.hideWhenFirstElectFull = option.hideWhenFirstElectFull;
        window.electCourseTable.config.passedCourses = option.passedCourses;

        // 英语等级规则
        window.electCourseTable.config.eng_courseId2Abilities = option.eng_courseId2Abilities;
        window.electCourseTable.config.eng_stdRates = option.eng_stdRates;

        window.electCourseTable.initElectedCourseTable();

        // 培养计划部分
        window.planCourseTable = new PlanCourseTable();
        window.planCourseTable.subjectCourses = option.subjectCourses;	// 学科课程祖内的课程ID

        // 教学任务部分
        window.teachClassTable = new TeachClassTable();

        window.electCart = new ElectCart();

        window.courseInfo = new CourseInfo();
        window.planCourseTable.refreshChosen();
        var _q = function() {
            electCourseTable.queryStdCount();
            setTimeout(_q, electCourseTable.config.time);
        };
        setTimeout(_q, electCourseTable.config.time);
    };

    ElectCourseTable.prototype.thisTurnRemain = function(lessonId) {
        jQuery.colorbox({
            transition:"none",
            title:"",
            href:electCourseTable.config.base + "/tJStdElectCourse!thisTurnRemain.action?lessonId=" + lessonId,
            width:"400px",
            height:"160px"
        });
    }
    var lessonPredicate = function(options) {
        return function() {
            var pass = true;
            for(key in options) {
                pass &= (this[key] == options[key]);
            }
            if(pass) return true;
            return false;
        };
    };

    var arrangePredicate = function(options) {
        return function() {
            for(var i = 0; i < this.arrangeInfo.length; i++) {
                var pass = true;
                for(key in options) {
                    if(key == "unit") {
                        pass &= this.arrangeInfo[i].startUnit <= options[key] && options[key] <= this.arrangeInfo[i].endUnit;
                    } else {
                        pass &= (this.arrangeInfo[i][key] == options[key]);
                    }
                }
                if(pass) return true;
            }
            return false;
        };
    };


    function PlanCourseTable() {
        this.table = jQuery("#planCourses table.data-table");
        this.chosenPlanCoursesTable = jQuery("#chosenPlanCourses table.data-table");
        this.choosebottonTable = jQuery("#choosebuttons table.data-table")
        this.hiscourseTable = jQuery("#allPlanCourses table.data-table")
        this.subjectCourseTable = jQuery("#subject-courses table.data-table")
        this.newneedCourses = jQuery("#newneedCourses table.data-table")
        this.publicCourseTable = jQuery("#publicCourses table.data-table")

        var that = this;
        // 点击“选择课程”按钮，出现弹出框，列出计划中的课程
        jQuery("#plancourse-btn").click(function() {
            that.choosebutten();
        });
        jQuery("#savetable-btn").click(function() {
            that.save();

        });
    }

    //替代课程对应表
    PlanCourseTable.prototype.fuckTheHell = [];

    //替代课程
    PlanCourseTable.prototype.whatTheFuck = [];

    //外国留学生专属课程
    PlanCourseTable.prototype.forAbroadCoursesinbox = [];
    //外语加强班课程
    PlanCourseTable.prototype.foreignCoursesinbox = [];
    //已选课程id 暂存处
    PlanCourseTable.prototype.oldlessonids =[];
    //要显示的所有课程
    PlanCourseTable.prototype.alllessons = [];
    //用于在右边实时显示的lessonId组合
    PlanCourseTable.prototype.nowchooselessons=[];
    //已选的，但是点清除后扔进去的lessonid
    PlanCourseTable.prototype.electanddislessons= [];
    //显示在左边的培养计划里的课程
    PlanCourseTable.prototype.choosedcourses = [];

    //显示在左边的计划外课程
    PlanCourseTable.prototype.onlessons = [];
    //已选课程
    PlanCourseTable.prototype.hislessons1 = [];
    //点击选择课程里培养计划里的课程
    PlanCourseTable.prototype.plancoursesshow =[];
    //点击选择课程里培养计划外的课程
    PlanCourseTable.prototype.outplanlessonsshow = [];
    //已经申请的课程
    PlanCourseTable.prototype.hisapplied=[];
    //教学班点击选中的课程
    PlanCourseTable.prototype.teachclasscourse = [];

    //所有计划外课程
    PlanCourseTable.prototype.alloutlessons = [];
    //已修的计划内课程
    PlanCourseTable.prototype.hislearnedcourses = [];
    //已修的计划外课程
    PlanCourseTable.prototype.hislearnedcourses1 = [];
    //有冲突的课程
    PlanCourseTable.prototype.conflictlessons =[];
    //所有公选课课程
    PlanCourseTable.prototype.publicchooselessons = [];

    //弹出已修课程框
    PlanCourseTable.prototype.hprompt = function() {

        if(!this.subCourses) {
            this.subCourses = TAFFY();
            this.subCourses.insert(window.subCourseStr);
        }
        //不能重修的
        var cannotretakeIds = window.passedCanNotRetakeTwiceCourseIds;
        var sub = "";
        var trs = "";
        for(var i=0;i<this.hislearnedcourses.length;i++){
            sub = "";
            var course = this.hislearnedcourses[i][0];
            var ifos = this.hislearnedcourses[i][1];
            if(ifos){
                for(var j=0;j<this.fuckTheHell.length;j++){
                    var dd = this.fuckTheHell[j][0];
                    if(dd == course.courseId){
                        var jsq = 0;
                        this.subCourses({id:this.fuckTheHell[j][1]}).each(function(subCourse,d){
                            sub += subCourse.name+"("+subCourse.code+")"+"</br>";
                        })
                    }
                }
            }
            var canRetake = true;
            var ncourseId = course.courseId;

            if(planCourseTable.showCourses({id:course.courseId}).count()>0){continue;}
            if(window.electCourseTable.config.cannotRetakeTwice){
                for(var ii=0;ii<cannotretakeIds.length;ii++){
                    courseId = window.passedCanNotRetakeTwiceCourseIds[ii];
                    if(ncourseId == courseId){
                        canRetake = false;
                    }
                }

            }
            if(!canRetake){continue;}

            trs += "<tr>";
            trs += "<td><input type='checkbox' name='course.id' value='" + course.id + "'/></td>";
//			trs += "<td>" + course.courseTypeName + "</td>";
            if (null == language || undefined == language || "" == language || "zh" == language) {
                trs += "<td>" + course.courseTypeName + "</td>";
            } else {
                trs += "<td>" + course.courseTypeEngName + "</td>";
            }
            trs += "<td>" + course.code +"</td>";
//			trs += "<td>" + course.name + "</td>";
            if (null == language || undefined == language || "" == language || "zh" == language) {
                trs += "<td>" + course.name + "</td>";
            } else {
                trs += "<td>" + course.engName + "</td>";
            }
            trs += "<td>" + course.credits + "</td>";
            //trs += "<td>" + (course.compulsory ? "必" : "选") + "</td>";
            if (null == language || undefined == language || "" == language || "zh" == language) {
                trs += "<td>" + (course.compulsory ? "必" : "选") + "</td>";
            } else {
                trs += "<td>" + (course.compulsory ? "CC" : "EC") + "</td>";
            }
            //是否替代课程
            trs += "<td>" + (ifos ? sub : "") +"</td>";
            trs += "</tr>";
        };



        this.hiscourseTable.find("tbody").html("");
        this.hiscourseTable.find("tbody").append(trs);

        //点击行选定
        this.hiscourseTable.find("tr").click(function(evt){
            var cbx = jQuery("td:first-child :checkbox", this);
            if(jQuery(evt.target).is(":checkbox")) {
                if(cbx.is(":checked")){jQuery(this).addClass("conflictlesson");}
                else{jQuery(this).removeClass("conflictlesson");}
                return
            };
            if(!cbx[0]) { return; }
            if(cbx.is(":checked")) { cbx.removeAttr("checked");jQuery(this).removeClass("conflictlesson"); }
            else { cbx.attr("checked", "checked");jQuery(this).addClass("conflictlesson"); }
        });
        // colorbox
//		var _title = "已修的课程&nbsp;&nbsp;";
//		_title += "<input type='button' onclick='window.planCourseTable.OkForhisCourse();' value='确定'/><input type='button' onclick='window.planCourseTable.choosebutten();' value='返回' />";
        var _title = "";
        if (null == language || undefined == language || "" == language || "zh" == language) {
            _title = "已修的课程&nbsp;&nbsp;";
            _title += "<input type='button' onclick='window.planCourseTable.OkForhisCourse();' value='确定'/><input type='button' onclick='window.planCourseTable.choosebutten();' value='返回' />";
        } else {
            _title = "Courses Completed&nbsp;&nbsp;";
            _title += "<input type='button' onclick='window.planCourseTable.OkForhisCourse();' value='OK'/><input type='button' onclick='window.planCourseTable.choosebutten();' value='Back' />";
        }
        jQuery.colorbox({transition:'none', overClose:false, width:"100%", inline:true, href:"#allPlanCourses", title:_title });

    };



    // 弹出框，列出计划中课程
    PlanCourseTable.prototype.prompt = function() {
        if(!this.planCourses) {
            this.planCourses = TAFFY();
            this.planCourses.insert(window.planCourses);
        }

        this.plancoursesshow = [];
        this.planCourses().each(function(pcourse,i) {
            planCourseTable.plancoursesshow.push(pcourse);
        });

        var lessons3 = [];
        var lessons5 = [];
        var lessons6 = [];
        this.planCourses().order("coruseSchoolYear,courseTypeCode,code").each(function(lesson,i){
            lessons3.push(lesson);
            lessons5.push(lesson);
        })

        for(var i=0;i<lessons3.length;i++){
            var lessons2=[];
            for(var j=0;j<lessons5.length;j++){
                if (lessons5[j].coruseSchoolYear == lessons3[i].coruseSchoolYear){
                    lessons2.push(lessons5[j]);
                    lessons5.splice(j,1);
                    j--
                }
            }
            if(lessons2.length != 0){
                lessons6.push(lessons2[0].coruseSchoolYear);
            }
        }


        //去掉已修的
        for(var i=0;i<this.hislearnedcourses.length;i++){
            for(var j=0;j<this.plancoursesshow.length;j++){
                if(this.plancoursesshow[j].code == this.hislearnedcourses[i][0].code){
                    this.plancoursesshow.splice(j,1);
                    j--;
                }
            }
        }



        // 处理学科课程组课程的问题
        for(var i=0;i<this.plancoursesshow.length;i++){
            var subjectCourseQuery = this.subjectCourses({id:this.plancoursesshow[i].id});
            // 发现当前课程是一个学科课程组的课程
            if(subjectCourseQuery.count() == 0) {
                continue;
            }
            // 如果存在已修且通过的同学科课程组的课程，而且该课程的等级>=这个计划中的学科课程组的课程，那么就不显示这个课程
            var subjectCourse = subjectCourseQuery.first();
            var broSubjectCourses = this.subjectCourses({groupId : subjectCourse.groupId, levelNum : {gte : subjectCourse.levelNum}}).get();
            var _sPassed = false;
            for(var j = 0; j < broSubjectCourses.length; j++) {
                var _c = broSubjectCourses[j];
                if(window.electCourseTable.config.hisCourses['c' + _c.id]) {
                    _sPassed = true;
                    break;
                }
            }
            if(_sPassed) {
                this.plancoursesshow.splice(i,1);
                i--;
            }
        }

        var trs = "";
        //var trs1 = "";
        for(var k=0 ;k<lessons6.length;k++){
            var courses = []
            for(var i=0;i<this.plancoursesshow.length;i++){
                if (this.plancoursesshow[i].coruseSchoolYear == lessons6[k]){
                    courses.push(this.plancoursesshow[i])
                }
            }
            if (courses.length>0){

                var trs1 = "";
                var trs2 = "";
                trs1 += "<tr><td colspan='7' class='title'>"+courses[0].coruseSchoolYear+"</td></tr>";
//				trs1 +="	<tr class='lessonAtRightAndLeft'><td></td><td>代码</td><td>名称</td><td>学分</td><td>必/选</td><td>课程类别</td><td>群组课程</td></tr> ";
                if (null == language || undefined == language || "" == language || "zh" == language) {
                    trs1 +="	<tr class='lessonAtRightAndLeft'><td></td><td>代码</td><td>名称</td><td>学分</td><td>必/选</td><td>课程类别</td><td>群组课程</td></tr> ";
                } else {
                    trs1 +="	<tr class='lessonAtRightAndLeft'><td></td><td>Course Code</td><td>Course Name</td><td>Credits</td><td>CC/EC</td><td>Course Category</td><td>群组课程</td></tr> ";
                }
                for(var i=0;i<courses.length;i++){
                    if(window.electCourseTable.lessons({courseId:courses[i].id}).count()>0 ){
                        var _canShow = true;
                        if (window.planCourseTable.subjectCourses({id:courses[i].id}).count()>0){
                            var group = window.planCourseTable.subjectCourses({id:courses[i].id}).first();
                            window.planCourseTable.subjectCourses({groupId:group.groupId}).each(function(course,i){
                                if(window.electCourseTable.lessons({courseId:course.id},{elected:true}).count()>0){
                                    _canShow = false;
                                }
                            })
                        }
                        if (_canShow){
                            if(!window.planCourseTable.showCourses({id:courses[i].id}).count()>0|| window.planCourseTable.subjectCourses({id:courses[i].id}).count()>0 ){
                                trs2 += "<tr>";
                                trs2 += "<td><input type='checkbox' name='courses[i].id' value='" + courses[i].id + "'/></td>";
                                trs2 += "<td>" + courses[i].code +"</td>";
                                trs2 += "<td>" + courses[i].name + "</td>";
                                trs2 += "<td>" + courses[i].credits + "</td>";
                                //trs2 += "<td>" + (courses[i].compulsory ? "必" : "选") + "</td>";
                                if (null == language || undefined == language || "" == language || "zh" == language) {
                                    trs2 += "<td>" + (courses[i].compulsory ? "必" : "选") + "</td>";
                                } else {
                                    trs2 += "<td>" + (courses[i].compulsory ? "CC" : "EC") + "</td>";
                                }
                                trs2 += "<td>" + courses[i].courseTypeName + "</td>";
                                if(this.isSubjectCourse(courses[i].id)) {
                                    trs2 += "<td><a href='#subjectCourse" + courses[i].id + "' onclick='window.planCourseTable.subjectCoursePrompt(" + courses[i].id + ")'>选择</a></td>";
                                } else {
                                    trs2 += "<td></td>";
                                }
                                trs2 += "</tr>";
                            }
                        }
                    }
                };

                if(trs2 != ""){ trs2 = trs1 +trs2 };
                trs +=trs2;
            }
        }
        this.table.find("tbody").html("");
        this.table.find("tbody").append(trs);
        //点击行选定
        this.table.find("tr").click(function(evt){
            var cbx = jQuery("td:first-child :checkbox", this);
            if(jQuery(evt.target).is(":checkbox")) {
                if(cbx.is(":checked")){jQuery(this).addClass("conflictlesson");}
                else{jQuery(this).removeClass("conflictlesson");}
                return
            };
            //if(jQuery(evt.))jQuery(this).removeClass("conflictlesson")
            if(!cbx[0]) { return; }
            if(cbx.is(":checked")) { cbx.removeAttr("checked");jQuery(this).removeClass("conflictlesson"); }
            else { cbx.attr("checked", "checked");jQuery(this).addClass("conflictlesson"); }
        });
        // colorbox
//		var _title = "选择培养计划课程&nbsp;&nbsp;";
//		_title += "<input id='inPlanOk' type='button' onclick='window.planCourseTable.Ok();' value='确定'/><input type='button' onclick='window.planCourseTable.choosebutten();' value='返回' />";
        var _title = "";
        if (null == language || undefined == language || "" == language || "zh" == language) {
            _title = "选择培养计划课程&nbsp;&nbsp;";
            _title += "<input id='inPlanOk' type='button' onclick='window.planCourseTable.Ok();' value='确定'/><input type='button' onclick='window.planCourseTable.choosebutten();' value='返回' />";
        } else {
            _title = "Select courses in cultivating scheme&nbsp;&nbsp;";
            _title += "<input id='inPlanOk' type='button' onclick='window.planCourseTable.Ok();' value='OK'/><input type='button' onclick='window.planCourseTable.choosebutten();' value='Back' />";
        }
        jQuery.colorbox({transition:'none', overClose:false, width:"100%", inline:true, href:"#planCourses", title:_title });
    };

    PlanCourseTable.prototype.searchPublicCourses = function(){
        if(!this.publicCourses) {
            this.publicCourses = TAFFY();
            this.publicCourses.insert(window.publicCourses);
        }
        var _courseId2FakeCourse;
        if(!this._courseId2FakeCourse) {
            // 构造courseId到假course的map，{courseId : xx, code : 'xx', name : 'xx', credits : xx, campuses : { name:1 }, arranges : ? }
            _courseId2FakeCourse = this._courseId2FakeCourse = {};
            window.electCourseTable.lessons().order("campuses,code").each(function(_l, index){
                _fakeCourse = _courseId2FakeCourse[_l.courseId];
                if(!_courseId2FakeCourse[_l.courseId]) {
                    _fakeCourse = {
                        courseId : _l.courseId,
                        code : _l.code,
//														name : _l.name,
                        name : null == language || undefined == language || "" == language || "zh" == language ? _l.name : _l.engName,
                        credits : _l.credits,
                        campuses : {},
                        engCampuses : {},
                        arrgnge : {}
                    };
                    _courseId2FakeCourse[_l.courseId] = _fakeCourse;
                }
                _fakeCourse.campuses[_l.campusName]=1;
                _fakeCourse.engCampuses[_l.campusEngName]=1;
                var weekDaysTwo = "";
                var weekDaysOne = electCourseTable.config.weekDays;
                for(var i=0;i<_l.arrangeInfo.length;i++){
                    arrgngeOne = _l.arrangeInfo[i];
                    weekDaysTwo += weekDaysOne[arrgngeOne.weekDay-1]+" : "+arrgngeOne.startUnit+" - "+arrgngeOne.endUnit;
//					if (i<_l.arrangeInfo.length-1){
//					    weekDaysTwo += ";"
//					}
                    if (0 != weekDaysTwo.length) {
                        weekDaysTwo += ";"
                    }
                }

                _fakeCourse.arrgnge[weekDaysTwo]=1;
            });
        }

        var that = this;
        if(this.publicchooselessons.length==0){
            this.publicCourses().each(function(courseType,index){
                for(var j=0;j<courseType.courseIds.length;j++){
                    var _fakeCourse = _courseId2FakeCourse[courseType.courseIds[j]];
                    if(_fakeCourse) that.publicchooselessons.push(_fakeCourse);
                }
            })
        }
    }

    //弹出框，列出计划外课程
    PlanCourseTable.prototype.oprompt = function(){

        this.searchPublicCourses();

        //去掉已修的
        for(var i=0;i<this.hislearnedcourses.length;i++){
            for(var j=0;j<this.publicchooselessons.length;j++){
                if(this.publicchooselessons[j].code == this.hislearnedcourses[i][0].code){
                    this.publicchooselessons.splice(j,1);
                    j--;
                }
            }

        }


        var trs = "";
        this.publicCourses().order("id").each(function(courseType,i){
            var coursesToShow =[];
            var courseIds = courseType.courseIds
            for(var i=0;i<planCourseTable.publicchooselessons.length;i++){
                var course = planCourseTable.publicchooselessons[i];
                for(var j=0;j<courseIds.length;j++){
                    if (course.courseId == courseIds[j]){
                        coursesToShow.push(course);
                    }
                }
            }

            trs1 = ""
            trs2 = ""

            trs1 +=  "<tr><td colspan='7'><h2>"+ courseType.name+"</h2></td></tr>";
//			trs1 += "<tr class='lessonAtRightAndLeft'><td width='100%'></td><td>代码</td><td>名称</td><td>学分</td><td>必/选</td><td>校区</td><td>时间</td></tr>";
            if (null == language || undefined == language || "" == language || "zh" == language) {
                trs1 += "<tr class='lessonAtRightAndLeft'><td width='100%'></td><td>代码</td><td>名称</td><td>学分</td><td>必/选</td><td>校区</td><td>时间</td></tr>";
            } else {
                trs1 += "<tr class='lessonAtRightAndLeft'><td width='100%'></td><td>Course Code</td><td>Course Name</td><td>Credits</td><td>CC/EC</td><td>Campus</td><td>Time</td></tr>";
            }
            for(var i=0;i<coursesToShow.length;i++){
                var course = coursesToShow[i]
                if(!window.planCourseTable.showCourses({id:course.courseId}).count()>0){
                    trs2 += "<tr>";
                    trs2 += "<td><input type='checkbox' name='this.course.id' value='" + course.courseId + "'/></td>";
                    //trs += "<td>" + courseType.name + "</td>";
                    trs2 += "<td>" + course.code +"</td>";
                    trs2 += "<td>" + course.name + "</td>";
                    trs2 += "<td>" + course.credits + "</td>";
//					trs2 += "<td>" + (course.compulsory ? "必" : "选") + "</td>";
                    if (null == language || undefined == language || "" == language || "zh" == language) {
                        trs2 += "<td>" + (course.compulsory ? "必" : "选") + "</td>";
                    } else {
                        trs2 += "<td>" + (course.compulsory ? "CC" : "EC") + "</td>";
                    }
                    campusesName = ""
                    if (null == language || undefined == language || "" == language || "zh" == language) {
                        for(var key in course.campuses){
                            campusesName += key+" "
                        }
                    }else{
                        for(var key in course.engCampuses){
                            campusesName += key+" "
                        }
                    }
                    trs2 += "<td>" + campusesName + "</td>";
                    weekDaysShow = ""
                    for(var key in course.arrgnge){
                        if (0 != weekDaysShow.length) {
                            weekDaysShow += ";";
                        }
//						 weekDaysShow += key+" ; "
                        weekDaysShow += key;
                    }
                    trs2 += "<td>" + weekDaysShow + "</td>";
                    trs2 += "</tr>";
                }
            }
            if (trs2 != ""){trs2 = trs1 + trs2};
            trs += trs2;
        });



        this.publicCourseTable.find("tbody").html("");
        this.publicCourseTable.find("tbody").append(trs);
        //点击行选定
        this.publicCourseTable.find("tr").click(function(evt){
            var cbx = jQuery("td:first-child :checkbox", this);
            if(jQuery(evt.target).is(":checkbox")){
                if(cbx.is(":checked")){jQuery(this).addClass("conflictlesson");}
                else{jQuery(this).removeClass("conflictlesson");}
                return;
            }
            if(!cbx[0]) { return; }
            if(cbx.is(":checked")) { cbx.removeAttr("checked");jQuery(this).removeClass("conflictlesson"); }
            else { cbx.attr("checked", "checked"); jQuery(this).addClass("conflictlesson");}
        });



        // colorbox
//		var _title = "公选课课程&nbsp;&nbsp;";
//		_title += "<input type='button' onclick='window.planCourseTable.publicCourseOk();' value='确定'/><input type='button' onclick='window.planCourseTable.choosebutten();' value='返回' />";
        if (null == language || undefined == language || "" == language || "zh" == language) {
            _title = "公选课课程&nbsp;&nbsp;";
            _title += "<input type='button' onclick='window.planCourseTable.publicCourseOk();' value='确定'/><input type='button' onclick='window.planCourseTable.choosebutten();' value='返回' />";
        } else {
            _title = "General elective course&nbsp;&nbsp;";
            _title += "<input type='button' onclick='window.planCourseTable.publicCourseOk();' value='OK'/><input type='button' onclick='window.planCourseTable.choosebutten();' value='Back' />";
        }
        jQuery.colorbox({transition:'none', overClose:false, width:"100%", inline:true, href:"#publicCourses", title:_title });
    };



    PlanCourseTable.prototype.faprompt = function(){
        var that = this;

        this.forAbroadCoursesinbox=[]
        this.forAbroadCourses().each(function(course,i){
            that.forAbroadCoursesinbox.push(course)
        })


        for(var i=0;i<this.hislearnedcourses.length;i++){
            for(var j=0;j<this.forAbroadCoursesinbox.length;j++){
                if(this.forAbroadCoursesinbox[j].code == this.hislearnedcourses[i][0].code){
                    this.forAbroadCoursesinbox.splice(j,1);
                    j--;
                }
            }

        }
        var trs = "";
        for(var i=0;i<this.forAbroadCoursesinbox.length;i++){
            var course = this.forAbroadCoursesinbox[i];
            if(window.electCourseTable.lessons({code:course.code}).count()>0){
                if(!window.planCourseTable.showCourses({code:course.code}).count()>0){
                    trs += "<tr>";
                    trs += "<td><input type='checkbox' name='course.id' value='" + course.id + "'/></td>";
                    trs += "<td>" + course.courseTypeName + "</td>";
                    trs += "<td>" + course.code +"</td>";
                    trs += "<td>" + course.name + "</td>";
                    trs += "<td>" + course.credits + "</td>";
//					trs += "<td>" + (course.compulsory ? "必" : "选") + "</td>";
                    if (null == language || undefined == language || "" == language || "zh" == language) {
                        trs += "<td>" + (course.compulsory ? "必" : "选") + "</td>";
                    } else {
                        trs += "<td>" + (course.compulsory ? "CC" : "EC") + "</td>";
                    }
                    trs += "<td></td>";
                    trs += "</tr>";
                }
            }
        };

        this.hiscourseTable.find("tbody").html("");
        this.hiscourseTable.find("tbody").append(trs);

        //点击行选定
        this.hiscourseTable.find("tr").click(function(evt){
            var cbx = jQuery("td:first-child :checkbox", this);
            if(jQuery(evt.target).is(":checkbox")){
                if(cbx.is(":checked")){jQuery(this).addClass("conflictlesson");}
                else{jQuery(this).removeClass("conflictlesson");}
                return;
            }
            if(!cbx[0]) { return; }
            if(cbx.is(":checked")) { cbx.removeAttr("checked"); jQuery(this).removeClass("conflictlesson");}
            else { cbx.attr("checked", "checked"); jQuery(this).addClass("conflictlesson");}
        });
        // colorbox
//		var _title = "留学生课程&nbsp;&nbsp;";
//		_title += "<input type='button' onclick='window.planCourseTable.Ok7();' value='确定'/><input type='button' onclick='window.planCourseTable.choosebutten();' value='返回' />";
        var _title = "";
        if (null == language || undefined == language || "" == language || "zh" == language) {
            _title = "留学生课程&nbsp;&nbsp;";
            _title += "<input type='button' onclick='window.planCourseTable.Ok7();' value='确定'/><input type='button' onclick='window.planCourseTable.choosebutten();' value='返回' />";
        } else {
            _title = "Courses for International Students&nbsp;&nbsp;";
            _title += "<input type='button' onclick='window.planCourseTable.Ok7();' value='OK'/><input type='button' onclick='window.planCourseTable.choosebutten();' value='Back' />";
        }
        jQuery.colorbox({transition:'none', overClose:false, width:"100%", inline:true, href:"#allPlanCourses", title:_title });
    }


    PlanCourseTable.prototype.fcprompt = function(){
        var that = this;
        this.foreignCoursesinbox=[];
        this.foreignCourses().each(function(course,i){
            that.foreignCoursesinbox.push(course)
        })


        for(var i=0;i<this.hislearnedcourses.length;i++){
            for(var j=0;j<this.foreignCoursesinbox.length;j++){
                if(this.foreignCoursesinbox[j].code == this.hislearnedcourses[i][0].code){
                    this.foreignCoursesinbox.splice(j,1);
                    j--;
                }
            }

        }
        var trs = "";
        for(var i=0;i<this.foreignCoursesinbox.length;i++){
            var course = this.foreignCoursesinbox[i];
            if(window.electCourseTable.lessons({code:course.code}).count()>0){
                if(!window.planCourseTable.showCourses({code:course.code}).count()>0){
                    trs += "<tr>";
                    trs += "<td><input type='checkbox' name='course.id' value='" + course.id + "'/></td>";
                    trs += "<td>" + course.courseTypeName + "</td>";
                    trs += "<td>" + course.code +"</td>";
                    trs += "<td>" + course.name + "</td>";
                    trs += "<td>" + course.credits + "</td>";
//					trs += "<td>" + (course.compulsory ? "必" : "选") + "</td>";
                    if (null == language || undefined == language || "" == language || "zh" == language) {
                        trs += "<td>" + (course.compulsory ? "必" : "选") + "</td>";
                    } else {
                        trs += "<td>" + (course.compulsory ? "CC" : "EC") + "</td>";
                    }
                    trs += "<td></td>";
                    trs += "</tr>";
                }
            }
        };

        this.hiscourseTable.find("tbody").html("");
        this.hiscourseTable.find("tbody").append(trs);


        //点击行选定
        this.hiscourseTable.find("tr").click(function(evt){
            var cbx = jQuery("td:first-child :checkbox", this);
            if(jQuery(evt.target).is(":checkbox")){
                if(cbx.is(":checked")){jQuery(this).addClass("conflictlesson");}
                else{jQuery(this).removeClass("conflictlesson");}
                return;
            }
            if(!cbx[0]) { return; }
            if(cbx.is(":checked")) { cbx.removeAttr("checked"); jQuery(this).removeClass("conflictlesson");}
            else { cbx.attr("checked", "checked"); jQuery(this).addClass("conflictlesson");}
        });
        // colorbox
//		var _title = "外语加强班课程&nbsp;&nbsp;";
//		_title += "<input type='button' onclick='window.planCourseTable.Ok8();' value='确定'/><input type='button' onclick='window.planCourseTable.choosebutten();' value='返回' />";
        var _title = "";
        if (null == language || undefined == language || "" == language || "zh" == language) {
            _title = "外语加强班课程&nbsp;&nbsp;";
            _title += "<input type='button' onclick='window.planCourseTable.Ok8();' value='确定'/><input type='button' onclick='window.planCourseTable.choosebutten();' value='返回' />";
        } else {
            _title = "Courses for International Students&nbsp;&nbsp;";
            _title += "<input type='button' onclick='window.planCourseTable.Ok8();' value='OK'/><input type='button' onclick='window.planCourseTable.choosebutten();' value='Back'/>";
        }
        jQuery.colorbox({transition:'none', overClose:false, width:"100%", inline:true, href:"#allPlanCourses", title:_title });
    }


    PlanCourseTable.prototype.Ok7 = function() {
        var that = this;
        this.hiscourseTable.find("tbody :checkbox:checked").each(function(i, ele) {
            // var distinct = [];
            for(var j=0;j<that.forAbroadCoursesinbox.length;j++){
                if(that.forAbroadCoursesinbox[j].id == parseInt(ele.value,10)){
                    var course = that.forAbroadCoursesinbox[j];
//			   		that.showCourses.insert({id:course.id,name:course.name,code:course.code,lessonId:"",credits:course.credits,teachers:"",canApply:false,no:"",turn:that.electTurn,state:"NA"})
                    if (null == language || undefined == language || "" == language || "zh" == language) {
                        that.showCourses.insert({id:course.id,name:course.name,code:course.code,lessonId:"",credits:course.credits,teachers:"",canApply:false,no:"",turn:that.electTurn,state:"NA"});
                    } else {
                        that.showCourses.insert({id:course.id,name:course.engName,code:course.code,lessonId:"",credits:course.credits,teachers:"",canApply:false,no:"",turn:that.electTurn,state:"NA"});
                    }
                }
            }
        });

        this.refreshChosen();
        jQuery.colorbox.close();
    };



    PlanCourseTable.prototype.Ok8 = function() {
        var that = this;
        this.hiscourseTable.find("tbody :checkbox:checked").each(function(i, ele) {
            for(var j=0;j<that.foreignCoursesinbox.length;j++){
                if(that.foreignCoursesinbox[j].id == parseInt(ele.value,10)){
                    var course = that.foreignCoursesinbox[j];
//			   		that.showCourses.insert({id:course.id,name:course.name,code:course.code,lessonId:"",credits:course.credits,teachers:"",canApply:false,no:"",turn:that.electTurn,state:"NA"})
                    if (null == language || undefined == language || "" == language || "zh" == language) {
                        that.showCourses.insert({id:course.id,name:course.name,code:course.code,lessonId:"",credits:course.credits,teachers:"",canApply:false,no:"",turn:that.electTurn,state:"NA"});
                    } else {
                        that.showCourses.insert({id:course.id,name:course.engName,code:course.code,lessonId:"",credits:course.credits,teachers:"",canApply:false,no:"",turn:that.electTurn,state:"NA"});
                    }
                }
            }
        });

        this.refreshChosen();
        jQuery.colorbox.close();
    };




    //选择按钮
    PlanCourseTable.prototype.choosebutten = function(){


        var grade = eval(window.grade)

        trs = "";
        if (null == language || undefined == language || "" == language || "zh" == language) {
            trs +="<tr><td><input type='button' name='button' onclick='window.planCourseTable.hprompt()' value='已修的课程'/></td></tr>";
            trs +="<tr><td><input type='button' name='button' onclick='window.planCourseTable.prompt()' value='计划内课程'/></td></tr>";
            if (this.forAbroadCourses().count()>0){
                trs +="<tr><td><input type='button' name='button' onclick='window.planCourseTable.faprompt()' value='留学生课程'/></td></tr>";
            }
            if(this.foreignCourses().count()>0){
                trs +="<tr><td><input type='button' name='button' onclick='window.planCourseTable.fcprompt()' value='加强班课程'/></td></tr>";
            }
            if (grade == "2009" || grade =="2008"){
                trs += "<tr><td><input type='button' name='button' onclick='window.planCourseTable.oprompt()' value='公共选修课'/></td></tr>";
            }else{
                trs += "<tr><td><input type='button' name='button' onclick='window.planCourseTable.oprompt()' value='素质与能力拓展课程'/></td></tr>";
            }
        } else {
            trs +="<tr><td><input type='button' name='button' onclick='window.planCourseTable.hprompt()' value='Courses Completed'/></td></tr>";
            trs +="<tr><td><input type='button' name='button' onclick='window.planCourseTable.prompt()' value='Courses  in Cultivating Scheme'/></td></tr>";
            if (this.forAbroadCourses().count()>0){
                trs +="<tr><td><input type='button' name='button' onclick='window.planCourseTable.faprompt()' value='Courses for International Students'/></td></tr>";
            }
            if(this.foreignCourses().count()>0){
                trs +="<tr><td><input type='button' name='button' onclick='window.planCourseTable.fcprompt()' value='Courses in Intensive Program'/></td></tr>";
            }
            if (grade == "2009" || grade =="2008"){
                trs += "<tr><td><input type='button' name='button' onclick='window.planCourseTable.oprompt()' value='General Elective Course'/></td></tr>";
            }else{
                trs += "<tr><td><input type='button' name='button' onclick='window.planCourseTable.oprompt()' value='Courses for Quality and Ability Development'/></td></tr>";
            }
        }

        this.choosebottonTable.find("tbody").html("");
        this.choosebottonTable.find("tbody").append(trs);
//		var _title = "选择课程所在区域&nbsp;&nbsp;";
        var _title = "";
        if (null == language || undefined == language || "" == language || "zh" == language) {
            _title = "选择课程所在区域&nbsp;&nbsp;";
        } else {
            _title = "Select the course area&nbsp;&nbsp;";
        }
        jQuery.colorbox({transition:'none',height:"300px", width:"500px", inline:true, href:"#choosebuttons", title:_title });
    };

    // 学科课程组
    /*
     * 是否学科课程组的课程
     */
    PlanCourseTable.prototype.isSubjectCourse = function(courseId){
        return this.subjectCourses({id:courseId}).count() > 0;
    };

    PlanCourseTable.prototype.subjectCoursePrompt = function(courseId) {
        var subjectCourse = this.subjectCourses({id:courseId}).first();
        var courses = this.subjectCourses({groupId : subjectCourse.groupId, levelNum : {gte:subjectCourse.levelNum}}).get();
        var _isShow = true;
        for(var i=0;i<courses.length;i++){
            var course = courses[i];
            if (window.electCourseTable.lessons({courseId:course.id},{elected:true}).count()>0){
                _isShow = false;
            }
        }

        var trs = "";
        for(var i=0;i<courses.length;i++){
            var course = courses[i];
            if (_isShow){
                if (window.electCourseTable.lessons({courseId:course.id}).count()>0){
                    var showed = false;
                    //去掉已显示的课程
                    for(var j=0;j<this.choosedcourses.length;j++){
                        if(course.id == this.choosedcourses[j].id) {
                            showed = true;
                            break;
                        }
                    }
                    if(showed) continue;
                    trs += "<tr>";
                    trs += "<td><input type='radio' name='subjectCourse.id' value='" + course.id + "'/></td>";
                    trs += "<td>" + course.code +"</td>";
//					trs += "<td>" + course.name + "</td>";
                    if (null == language || undefined == language || "" == language || "zh" == language ||null == course.engName) {
                        trs += "<td>" + course.name + "</td>";
                    } else {
                        trs += "<td>" + course.engName + "</td>";
                    }
                    trs += "<td>" + course.credits + "</td>";
                    trs += "<td>" + course.levelNum + "</td>";
                    trs += "</tr>";
                }
            }
        };
        this.subjectCourseTable.find("tbody").html("");
        this.subjectCourseTable.find("tbody").append(trs);
        //点击行选定
        this.subjectCourseTable.find("tr").click(function(evt){
            if(jQuery(evt.target).is(":radio")) return;
            var cbx = jQuery("td:first-child :radio", this);
            if(!cbx[0]) { return; }
            if(cbx.is(":checked")) { cbx.removeAttr("checked"); jQuery(this).removeClass("conflictlesson");}
            else { cbx.attr("checked", "checked"); jQuery(this).addClass("conflictlesson");}
        });
        // colorbox
//		var _title = "选择群组课程<input type='button' onclick='window.planCourseTable.subjectCourseOk();' value='确定' /><input type='button' onclick='window.planCourseTable.prompt()' value='返回' />";
        var _title = "";
        if (null == language || undefined == language || "" == language || "zh" == language) {
            _title = "选择群组课程<input type='button' onclick='window.planCourseTable.subjectCourseOk();' value='确定' /><input type='button' onclick='window.planCourseTable.prompt()' value='返回' />";
        } else {
            _title = "选择群组课程<input type='button' onclick='window.planCourseTable.subjectCourseOk();' value='OK' /><input type='button' onclick='window.planCourseTable.prompt()' value='Back' />";
        }
        jQuery.colorbox({transition:'none', overClose:false, width:"800px", inline:true, href:"#subject-courses", title:_title });

    };

    // 确定选择学科课程组，并且显示到左边
    PlanCourseTable.prototype.subjectCourseOk = function() {

        var that = this;
        // 首先更新是否已在左侧显示的状态
        this.subjectCourseTable.find("tbody :radio:checked").each(function(i, ele) {
            var pcourse = that.subjectCourses({id:parseInt(ele.value, 10)}).first();
            if(pcourse) {
                // 已经在左边出现了的课程就不重复在左侧加了
                var _in = false;
                that.showCourses().each(function(course,i){
                    if(course.code == pcourse.code) {
                        _in = true;
                        //break;
                    }
                })
                if(!_in) {
                    that.showCourses.insert({id:pcourse.id,name:pcourse.name,code:pcourse.code,lessonId:"",credits:pcourse.credits,teachers:"",canApply:pcourse.canApply,no:"",turn:that.electTurn,state:"NA"});
                }
                // 删掉左侧同学科课程组的已选课程
                that.subjectCourses({groupId:pcourse.groupId}).each(function(c, i) {
                    if(c.id == pcourse.id) return

                    that.showCourses({id:c.id}).remove();
                });
                // TODO 删除左侧同学科课程组的在购物车内的操作
            }
        });

        for(var i=0 ;i<that.hislessons1.length;i++){
            for(var j=0 ;j<that.choosedcourses.length;j++){
                if (that.choosedcourses[j].code == that.hislessons1[i].code){
                    that.choosedcourses.splice(j,1);
                    j--;
                }
            }
        }
        this.refreshChosen();
        jQuery.colorbox.close();
    };


    //保存课表
    PlanCourseTable.prototype.save =function(){

        //alert(electCart.operations)
        for(var i=0;i<electCart.operations.length;i++){
            var lessonId = electCart.operations[i][0]
            if(window.electCourseTable.lessons({id:lessonId},{elected:true}).count()>0){
                electCart.operations.splice(i,1)
                i--;

            }
        }

//		if (electCart.operations.length ==0){alert("你没有要保存的数据！");return;}
        if (null == language || undefined == language || "" == language || "zh" == language) {
            if (electCart.operations.length ==0){alert("你没有要保存的数据！");return;}
        } else {
            if (electCart.operations.length ==0){alert("You don't have data to save！");return;}
        }
        window.electCourseTable.showLessonOnTable(null,true);
        //if(planCourseTable.conflictlessons.length>0){alert("有冲突课程，请检查！");return;}


        var electLessonIds="";
        var withdrawLessonIds = "";
        var exchangeLessonPairs = "";
        for(var i=0;i<electCart.operations.length;i++){
            var op = electCart.operations[i];
            if(op[1]==true){
                electLessonIds		+= op[0] + ",";
            }else if (op[1]==false){
                withdrawLessonIds	+= op[0] + ",";
            }else if (op[2]=='ex') {
                // 原lessonId-新lessonId
                exchangeLessonPairs	+= op[0] + '-' + op[1] + ',';
            }
        }
        if(!this.engCheck(electLessonIds, withdrawLessonIds)) {
            return;
        }
        //	setTimeout("electCart.clear()",700);

        jQuery.colorbox({
            transition:"none",
            title:"",
            href: electCourseTable.config.base
            + "/tJStdElectCourse!batchOperator.action?"
            + "electLessonIds=" + encodeURIComponent(electLessonIds)
            + "&withdrawLessonIds=" + encodeURIComponent(withdrawLessonIds)
            + "&exchangeLessonPairs=" + encodeURIComponent(exchangeLessonPairs)
            ,
            width:"800px",
            height:"320px"
        });
    };
















    // 检查英语等级规则的前端检查，规则逻辑和EnglishAbilityChecker一样
    PlanCourseTable.prototype.engCheck = function(electLessonIds, withdrawLessonIds) {
        var eng_courseId2Abilities = window.electCourseTable.config.eng_courseId2Abilities;
        var eng_stdRates = window.electCourseTable.config.eng_stdRates;
        // 如果本轮没有开放英语等级的课程，那么根本就不需要检验
        if(jQuery.isEmptyObject(eng_courseId2Abilities)) {
            return true;
        }
        // 本轮开放的英语课程的ID
        var engCourseIds = new Array();
        for(var cId in eng_courseId2Abilities) {
            engCourseIds.push(cId);
        }
        // 已选的课程ID
        var electedCourseIds = new Array();
        window.electCourseTable.lessons({elected:true}).each(function(l, i) {
            electedCourseIds.push('' + l.courseId);
        });

        // 记录本次课表保存中，要选的英语课数量（选的-退的）
        var toElectEngCourseCount = 0;
        electLessonIds = electLessonIds.split(',');
        // 记录本次课表保存中，选的英语课数量
        for(var i = 0; i < electLessonIds.length; i++) {
            var lessonId = electLessonIds[i];
            if(lessonId == "") {
                continue;
            }
            var lesson = window.electCourseTable.lessons({id : parseInt(lessonId, 10)}).first();

            var courseAbilities = eng_courseId2Abilities["" + lesson.courseId];
            // 如果要选的课程是英语课程
            if(courseAbilities) {
                /*
                 // 如果已选的课程ID和英语课程ID有交集，那么就不能再选英语课了
                 for(var i = 0; i < electedCourseIds.length; i++) {
                 for(var j = 0; j < engCourseIds.length; j++) {
                 if(electedCourseIds[i] == engCourseIds[j]) {
                 alert("不能选一门以上的英语课");
                 return false;
                 }
                 }
                 }
                 */
                // 但是学生自己没有英语能力
                if(eng_stdRates.length == 0) {
//					alert("系统缺少您的英语能力信息，不能选英语课: " + lesson.no + " " + lesson.courseName);
                    if (null == language || undefined == language || "" == language || "zh" == language) {
                        alert("系统缺少您的英语能力信息，不能选英语课: " + lesson.no + " " + lesson.courseName);
                    } else {
                        alert("There is a lack of your English ability information.You can not select English class:" + lesson.no + " " + lesson.courseName);
                    }
                    return false;
                }
                var engGood = false;
                for(var j = 0; j < eng_stdRates.length; j++) {
                    // 学生如果是大学英语免修级，那么是不能选课的
                    if(eng_stdRates[j] == "大学英语免修级") {
//						alert("您的英语课程是免修的，不能选择英语课程: " + lesson.no + " " + lesson.courseName);
                        if (null == language || undefined == language || "" == language || "zh" == language) {
                            alert("您的英语课程是免修的，不能选择英语课程: " + lesson.no + " " + lesson.courseName);
                        } else {
                            alert("You are exempt from English course so that you can not choose English course: " + lesson.no + " " + lesson.courseName);
                        }
                        return false;
                    }
                    for(var k = 0; k < courseAbilities.length; k++) {
                        // 如果学生的英语等级和课程的英语等级匹配
                        if(eng_stdRates[j] == courseAbilities[k]) {
                            toElectEngCourseCount++;
                            engGood = true;
                            break;
                        }
                    }
                }
                if(!engGood) {
//					alert("您的英语能力:" + eng_stdRates.join("") + "\n不满足 " + lesson.no + " " + lesson.name + "\n的要求：" +courseAbilities.join("") );
                    if (null == language || undefined == language || "" == language || "zh" == language) {
                        alert("您的英语能力:" + eng_stdRates.join("") + "\n不满足 " + lesson.no + " " + lesson.name + "\n的要求：" +courseAbilities.join("") );
                    } else {
                        alert("Your English level is :" + eng_stdRates.join("") + "\nYou have not met the requirements of " + lesson.no + " " + lesson.engName + "\n：" +courseAbilities.join("") );
                    }
                    return false;
                }
            }
        }

        withdrawLessonIds = withdrawLessonIds.split(",");
        for(var i = 0; i < withdrawLessonIds.length; i++) {
            var lessonId = withdrawLessonIds[i];
            if(lessonId == "") {
                continue;
            }
            var courseAbilities = eng_courseId2Abilities[lessonId];
            // 如果要选的课程是英语课程
            if(courseAbilities) {
                toElectEngCourseCount--;
            }
        }
        if(toElectEngCourseCount > 1) {
//			alert("不能选一门以上的英语课");
            if (null == language || undefined == language || "" == language || "zh" == language) {
                alert("不能选一门以上的英语课");
            } else {
                alert("You are allowed to choose only one English class.");
            }
            return false;
        }
        return true;
    };

    // 确定选择计划课程，并在左侧显示出来
    PlanCourseTable.prototype.Ok = function() {
        //this.table.find("#inPlanOk").attr("disabled","sss");
        var that = this;
        // 首先更新是否已在左侧显示的状态
        this.table.find("tbody :checkbox:checked").each(function(i, ele) {
            var _q = that.planCourses({id:parseInt(ele.value, 10)});
            var pcourse = _q.first();

            if(pcourse) {
                if(!that.showCourses({id:pcourse.id}).count()>0){
                    if(that.subjectCourses({id:pcourse.id}).count()>0){
                        var courseGroup = that.subjectCourses({id:pcourse.id}).first()
                        that.subjectCourses({groupId:courseGroup.groupId}).each(function(course,i){
                            that.showCourses({id:course.id}).remove();
                        })
                    }
                    if(that.canApplyCourses({courseId:pcourse.id}).count()>0 && that.planCourses({id:pcourse.id},{canApplyed:true}).count()>0){
                        that.showCourses.insert({id:pcourse.id,name:pcourse.name,code:pcourse.code,lessonId:"",credits:pcourse.credits,teachers:"",canApply:true,no:"",turn:that.electTurn,state:"NA"});
                    }else{
                        that.showCourses.insert({id:pcourse.id,name:pcourse.name,code:pcourse.code,lessonId:"",credits:pcourse.credits,teachers:"",canApply:pcourse.canApply,no:"",turn:that.electTurn,state:"NA"});
                    }
                }
            }
        });


        this.refreshChosen();
        jQuery.colorbox.close();
    };


    PlanCourseTable.prototype.publicCourseOk = function() {
        var that = this;
        // 首先更新是否已在左侧显示的状态parseInt(ele.value,10)
        //alert(this.choosedlessons);
        this.publicCourseTable.find("tbody :checkbox:checked").each(function(i, ele) {
            var course;
            for(var j=0;j<that.publicchooselessons.length;j++){
                if(that.publicchooselessons[j].courseId == parseInt(ele.value,10)){
                    course = that.publicchooselessons[j];
                    break;
                }
            }
            that.showCourses.insert({id:course.courseId,name:course.name,code:course.code,lessonId:null,credits:course.credits,teachers:'',no:'',canApply:false,turn:that.electTurn,state:"NA"});

        });

        this.refreshChosen();
        jQuery.colorbox.close();
    };


    PlanCourseTable.prototype.OkForhisCourse = function() {
        var that = this;
        // 首先更新是否已在左侧显示的状态parseInt(ele.value,10)
        this.hiscourseTable.find("tbody :checkbox:checked").each(function(i, ele) {
            for(var i=0;i<that.hislearnedcourses.length;i++){
                var course;
                if(that.hislearnedcourses[i][0].id == parseInt(ele.value,10)){
                    course = that.hislearnedcourses[i][0]
                    break;
                }
            }
            if(that.canApplyCourses({courseId:course.courseId}).count()>0 && that.planCourses({Id:course.courseId},{canApplyed:true}).count()>0){
//				that.showCourses.insert({id:course.courseId,name:course.name,code:course.code,lessonId:"",credits:course.credits,teachers:"",canApply:true,no:"",turn:that.electTurn,state:"NA"})
                if (null == language || undefined == language || "" == language || "zh" == language) {
                    that.showCourses.insert({id:course.courseId,name:course.name,code:course.code,lessonId:"",credits:course.credits,teachers:"",canApply:true,no:"",turn:that.electTurn,state:"NA"})
                } else {
                    that.showCourses.insert({id:course.courseId,name:course.engName,code:course.code,lessonId:"",credits:course.credits,teachers:"",canApply:true,no:"",turn:that.electTurn,state:"NA"})
                }
            }else{
//				that.showCourses.insert({id:course.courseId,name:course.name,code:course.code,lessonId:"",credits:course.credits,teachers:"",canApply:false,no:"",turn:that.electTurn,state:"NA"})
                if (null == language || undefined == language || "" == language || "zh" == language) {
                    that.showCourses.insert({id:course.courseId,name:course.name,code:course.code,lessonId:"",credits:course.credits,teachers:"",canApply:false,no:"",turn:that.electTurn,state:"NA"});
                } else {
                    that.showCourses.insert({id:course.courseId,name:course.engName,code:course.code,lessonId:"",credits:course.credits,teachers:"",canApply:false,no:"",turn:that.electTurn,state:"NA"});
                }
            }
        });

        this.refreshChosen();
        jQuery.colorbox.close();
    };



    // 刷新左侧的已选计划课程
    PlanCourseTable.prototype.refreshChosen = function() {
        window.hisCourseIds = []
        var that = this;
        var trs = "";
        //alert("ndnd")


        if(!this.electTurn){
            this.electTurn = eval(window.electTurn)
        }

        if(!this.planCourses) {
            this.planCourses = TAFFY();
            this.planCourses.insert(window.planCourses);
        }

        if(this.hislearnedcourses.length == 0){
            for(var key in electCourseTable.config.hisCourses){
                hisCourseIds.push(parseInt(key.substr(1),10));
            }
            for(var i=0;i<hisCourseIds.length;i++){
                hisCourseId = hisCourseIds[i];
                var arr=[];

                var lesson = window.electCourseTable.lessons({courseId : hisCourseId}).first()
                if(lesson != false){
                    arr.push(lesson);
                    arr.push(false);
                    that.hislearnedcourses.push(arr);
                }
            }
        }



        if(this.whatTheFuck.length == 0){

            for(hisCourseId in electCourseTable.config.hisCourses){
                for(var i=0;i<electCourseTable.config.courseSubstitutions.length;i++){
                    var courseSubstitution = electCourseTable.config.courseSubstitutions[i];
                    if(typeof courseSubstitution.origins[hisCourseId] !="undefined"){
                        var ii = [];
                        for(var key in courseSubstitution.substitutes){
                            this.whatTheFuck.push(parseInt(key.substr(1),10));
                            ii.push(parseInt(key.substr(1),10));// 替代0
                            ii.push(parseInt(hisCourseId.substr(1),10));//原1
                            //var k=0;
                            /*for(var j=0;j<this.fuckTheHell.length;j++){
                             if(this.fuckTheHell[j][0]==ii[0]){
                             k++;
                             }
                             }
                             if(k==0){*/
                            this.fuckTheHell.push(ii);
                            ii = [];
                            //}
                        }
                    }
                }
            }


            for(var i=0;i<this.fuckTheHell.length;i++){
                hisCourseId = this.fuckTheHell[i][0];
                var lesson = window.electCourseTable.lessons({courseId : hisCourseId}).first()
                if(lesson != false){
                    var arr=[];
                    arr.push(lesson);
                    arr.push(true);
                    var k=0;
                    for(var j=0;j<that.hislearnedcourses.length;j++){
                        if(that.hislearnedcourses[j][0]==arr[0]){
                            k++;
                        }
                    }
                    if(k==0){
                        that.hislearnedcourses.push(arr);
                    }
                }
            }
        }


        if(!this.canApplyCourses){
            this.canApplyCourses = TAFFY();
            this.canApplyCourses.insert(window.canApplyCourses);
        }

        if(!this.forAbroadCourses) {
            this.forAbroadCourses = TAFFY();
            this.forAbroadCourses.insert(window.forAbroadCourses);
        }

        if(!this.foreignCourses) {
            this.foreignCourses = TAFFY();
            this.foreignCourses.insert(window.foreignCourses);
        }
        if(!this.showCourses){
            this.showCourses = TAFFY();
            window.electCourseTable.lessons({elected:true}).each(function(lesson,i){
//				that.showCourses.insert({id:lesson.courseId,name:lesson.name,code:lesson.code,lessonId:lesson.id,credits:lesson.credits,teachers:lesson.teachers,no:lesson.no,canApply:false,turn:lesson.turn,state:"ELE"});

                if (null == language || undefined == language || "" == language || "zh" == language) {
                    that.showCourses.insert({id:lesson.courseId,name:lesson.name,code:lesson.code,lessonId:lesson.id,credits:lesson.credits,teachers:lesson.teachers,no:lesson.no,canApply:false,turn:lesson.turn,state:"ELE"});
                } else {
                    that.showCourses.insert({id:lesson.courseId,name:lesson.engName,code:lesson.code,lessonId:lesson.id,credits:lesson.credits,teachers:lesson.teachers,no:lesson.no,canApply:false,turn:lesson.turn,state:"ELE"});
                }
            });
            for(var i=0;i<window.applyCourseIds.length;i++){
                var applyCourseId = window.applyCourseIds[i];
                var applyCourse = that.canApplyCourses({courseId:applyCourseId}).first();
//				if(that.showCourses({id:applyCourse.courseId}).count()==0){
//					that.showCourses.insert({id:applyCourse.courseId,name:applyCourse.name,code:applyCourse.code,lessonId:"",credits:applyCourse.credits,teachers:"",canApply:true,no:"",turn:that.electTurn,state:"APP"});
                if (null == language || undefined == language || "" == language || "zh" == language) {
                    that.showCourses.insert({id:applyCourse.courseId,name:applyCourse.name,code:applyCourse.code,lessonId:"",credits:applyCourse.credits,teachers:"",canApply:true,no:"",turn:that.electTurn,state:"APP"});
                } else {
                    that.showCourses.insert({id:applyCourse.courseId,name:applyCourse.engName,code:applyCourse.code,lessonId:"",credits:applyCourse.credits,teachers:"",canApply:true,no:"",turn:that.electTurn,state:"APP"});
                }
//				}
            }
        }


        this.showCourses().each(function(course,i){
            if(that.showCourses({id:course.id},{state:"WW"}).count()>0){return;}
            if (that.showCourses({id:course.id},{state:"ELE"}).count()>0){
                trs += "<tr id='"+course.code+"' class='red' onclick='window.teachClassTable.refresh(" + "\"" + course.code + "\"" + ");'>";
//				trs += "<td>已选</td>";
                if (null == language || undefined == language || "" == language || "zh" == language) {
                    trs += "<td>已选</td>";
                } else {
                    trs += "<td>Selected</td>";
                }
            }else if (that.showCourses({id:course.id},{state:"WE"}).count()>0){
                trs += "<tr id='"+course.code+"' class='nowChooseLessons' onclick='window.teachClassTable.refresh(" + "\"" + course.code + "\"" + ");'>";
                if(null == language || undefined == language || "" == language || "zh" == language) {
                    trs += "<td>备选</td>";
                } else {
                    trs += "<td>Alternative</td>";
                }
            }else {
                trs += "<tr id='"+course.code+"' onclick='window.teachClassTable.refresh(" + "\"" + course.code + "\"" + ");'>";
//				trs += "<td>未选</td>";
                if (null == language || undefined == language || "" == language || "zh" == language) {
                    trs += "<td>未选</td>";
                } else {
                    trs += "<td>Unselected</td>";
                }
            }
            trs += "<td>" + course.name +"("+course.code+")" +"</td>";
            trs += "<td>" + course.credits + "</td>";
//			trs += "<td>" + (planCourseTable.planCourses({code :course.code}).count()>0? "必" : "选") + "</td>";
            if (null == language || undefined == language || "" == language || "zh" == language) {
                trs += "<td>" + (planCourseTable.planCourses({code :course.code}).count()>0 ? "必" : "选") + "</td>";
            } else {
                trs += "<td>" + (planCourseTable.planCourses({code :course.code}).count()>0? "CC" : "EC") + "</td>";
            }


            // 教师，需要根据选课情况更新
            //var _elected_lesson = window.electCourseTable.lessons({code:course.code, elected:true}).first();
            if(that.showCourses({code:course.code},{state:"NA"}).count()>0 || that.showCourses({id:course.id},{state:"APP"}).count()>0) {
                //trs += "<td>"+_elected_lesson.no +"(" +_elected_lesson.teachers +")"+ "</td>";
                trs += "<td></td>";
            }else {
                trs +="<td>"+course.no+"("+course.teachers+")"+"</td>"
            }
            var lesson = that.showCourses({code:course.code},{state:"ELE"}).first();
            if(lesson){
                trs +="<td>"+course.turn+"</td>";
            }else{
                trs +="<td></td>";
            }

            // TODO 操作，是否可退课
            var clear_op = "";
//			if (that.showCourses({id:course.id},{state:"ELE"}).count()>0){
//				clear_op +="<a href='#withdraw" + course.id + "' onclick='window.planCourseTable.change3(" + course.lessonId + ");return false;'>退课</a>"
//			} else if (that.showCourses({id:course.id},{state:"APP"}).count()>0){
//				clear_op +="<a href='#disapply" + course.id + "' onclick='window.planCourseTable.disapply(" + course.id+ ");return false;'>撤销申请</a>"
//			} else if (that.showCourses({id:course.id},{state:"WE"}).count()>0) {
//				clear_op +="<a href='#remove" + course.id + "' onclick='window.planCourseTable.remove(" + course.lessonId + ");return false;'>清除</a>"
//			} else if (that.showCourses({id:course.id},{state:"NA"},{canApply:true}).count()>0) {
//				clear_op ="<a href='#apply" + course.id + "' onclick='window.planCourseTable.apply(" + course.id + ");return false;'>申请</a>"
//			}
            if (null == language || undefined == language || "" == language || "zh" == language) {
                if (that.showCourses({id:course.id},{state:"ELE"}).count()>0){
                    clear_op +="<a href='#withdraw" + course.id + "' onclick='window.planCourseTable.change3(" + course.lessonId + ");return false;'>退课</a>"
                } else if (that.showCourses({id:course.id},{state:"APP"}).count()>0){
                    clear_op +="<a href='#disapply" + course.id + "' onclick='window.planCourseTable.disapply(" + course.id+ ");return false;'>撤销申请</a>"
                } else if (that.showCourses({id:course.id},{state:"WE"}).count()>0) {
                    clear_op +="<a href='#remove" + course.id + "' onclick='window.planCourseTable.remove(" + course.lessonId + ");return false;'>清除</a>"
                } else if (that.showCourses({id:course.id},{state:"NA"},{canApply:true}).count()>0) {
                    clear_op ="<a href='#apply" + course.id + "' onclick='window.planCourseTable.apply(" + course.id + ");return false;'>申请</a>"
                }
            } else {
                if (that.showCourses({id:course.id},{state:"ELE"}).count()>0){
                    clear_op +="<a href='#withdraw" + course.id + "' onclick='window.planCourseTable.change3(" + course.lessonId + ");return false;'>Drop</a>"
                } else if (that.showCourses({id:course.id},{state:"APP"}).count()>0){
                    clear_op +="<a href='#disapply" + course.id + "' onclick='window.planCourseTable.disapply(" + course.id+ ");return false;'>Cancel Apply</a>"
                } else if (that.showCourses({id:course.id},{state:"WE"}).count()>0) {
                    clear_op +="<a href='#remove" + course.id + "' onclick='window.planCourseTable.remove(" + course.lessonId + ");return false;'>Clear</a>"
                } else if (that.showCourses({id:course.id},{state:"NA"},{canApply:true}).count()>0) {
                    clear_op ="<a href='#apply" + course.id + "' onclick='window.planCourseTable.apply(" + course.id + ");return false;'>Apply</a>"
                }
            }


            var op = "";
            op += clear_op;
            trs += "<td>" + op + "</td>";
            trs += "</tr>";
        })




        this.chosenPlanCoursesTable.find("tbody").html('');
        this.chosenPlanCoursesTable.append(trs);
    };

    //申请选课

    PlanCourseTable.prototype.apply = function(pcourseId) {
        jQuery.colorbox({
            transition:"none",
            title:"",
            href:electCourseTable.config.base + "/tJStdElectCourse!applyCourse.action?courseId=" + pcourseId,
            width:"400px",
            height:"160px"
        });
    }


    //撤销申请选课
    PlanCourseTable.prototype.disapply = function(pcourseId) {
        setTimeout("planCourseTable.refreshChosen()",500);
        jQuery.colorbox({
            transition:"none",
            title:"",
            href:electCourseTable.config.base + "/tJStdElectCourse!disApplyCourse.action?courseId=" + pcourseId,
            width:"400px",
            height:"160px"
        });
    }

    // 清除已选的计划课程
    PlanCourseTable.prototype.remove = function (lessonId) {
        var lesson = window.electCourseTable.lessons({id:lessonId}).first();

        for(var i=0;i<electCart.operations.length;i++){
            var elelesson = window.electCourseTable.lessons({id:electCart.operations[i][0]}).first();
            if (elelesson.code == lesson.code){
                electCart.operations.splice(i,1);
                i--;
            }
        }

        if (window.electCourseTable.lessons({courseId:lesson.courseId},{elected:true}).count()>0){
            var hisLesson = window.electCourseTable.lessons({courseId:lesson.courseId},{elected:true}).first()
            window.planCourseTable.showCourses({id:lesson.courseId}).update({state:"ELE",teachers:hisLesson.teachers,no:hisLesson.no})
        }else{
            window.planCourseTable.showCourses({id:lesson.courseId}).update({state:"NA"})
        }

        this.refreshChosen();
        electCourseTable.showLessonOnTable(null,false);
    };




    //课程退课
    PlanCourseTable.prototype.change3 = function (pcourseId) {

        if(window.electCourseTable.config.cannotWithDrawThisTurn){
            var course = window.planCourseTable.showCourses({lessonId:pcourseId}).first();
            if(course.turn != window.planCourseTable.electTurn){
                alert("不能退本伦次之外的课！");
                return;
            }
        }
//		if(confirm('你确定要退课 ?')) {
        if(confirm(null == language || undefined == language || "" == language || "zh" == language ? '你确定要退课 ?' : 'Are you sure to drop a course?')) {
            var lesson = window.electCourseTable.lessons({id : pcourseId}).first();
            setTimeout("planCourseTable.refreshChosen()",2000);
            setTimeout("electCourseTable.initElectedCourseTable()",2000);
            jQuery.colorbox({
                transition:"none",
                title:"",
                href:electCourseTable.config.base + "/tJStdElectCourse!batchOperator.action?withdrawLessonIds=" + lesson.id,
                width:"800px",
                height:"320px"
            });
        }
    }



    // 选中所有的计划课程
    PlanCourseTable.prototype.checkAll = function() {
        var j_allbox =  this.table.find("thead tr th:checkbox");
        if(j_allbox.is(":checked")) {
            this.table.find("tbody :checkbox").attr("checked", "checked");
        } else {
            this.table.find("tbody :checkbox").removeAttr("checked");
        }
    };



    PlanCourseTable.prototype.checkAll2 = function() {
        var j_allbox =  this.hiscourseTable.find("thead tr th:nth-child(1) :checkbox");
        if(j_allbox.is(":checked")) {
            this.hiscourseTable.find("tbody :checkbox").attr("checked", "checked");
        } else {
            this.hiscourseTable.find("tbody :checkbox").removeAttr("checked");
        }
    };

    /**************************************************
     * 教学任务相关功能
     **************************************************/
    function TeachClassTable() {
        this.table = jQuery("#teachClass table.data-table");
    }

    /*************************************************
     *标题上的课程信息
     * ************************************************/
    function CourseInfo(){
        this.table = jQuery("#op-area-prompt ");
    }

    CourseInfo.prototype.refresh = function(courseCode){
        var tbody = courseInfo.table.find("tbody");
        this.table.empty();
        var course ;
        course = window.planCourseTable.showCourses({code:courseCode}).first()
//		trs="<tr><td><b>课程号码：</b></td><td>"+course.code+"</td><td><b>课程名称：</b></td><td>"+course.name+"</td></tr>";
        if (null == language || undefined == language || "" == language || "zh" == language) {
            trs="<tr><td><b>课程号码：</b></td><td>"+course.code+"</td><td><b>课程名称：</b></td><td>"+course.name+"</td></tr>";
        } else {
            trs="<tr><td><b>Course Code：</b></td><td>"+course.code+"</td><td><b>Course Name：</b></td><td>"+course.name+"</td></tr>";
        }
        this.table.append(trs);
    }

    //初始化任务列表
    TeachClassTable.prototype.refresh = function(courseCode){
        window.courseInfo.refresh(courseCode);

        jQuery(window.planCourseTable.chosenPlanCoursesTable).click(function(){
            jQuery(this).find("tbody tr").removeClass("lessonAtRightAndLeft");
            jQuery(this).find("#"+courseCode).addClass("lessonAtRightAndLeft");
        });

        var lessonQuery = window.electCourseTable.lessons({code : courseCode});
        var tbody = this.table.find("tbody");
        tbody.empty();
        var trs = "";
        lessonQuery.order("campusCode,no").each(function(lesson, i) {
            var _c = window.lessonId2Counts["" + lesson.id];
            // 校区的颜色
            var l_color = window.campusCodes[lesson.campusCode];
            var _style = "";
            if(l_color) {
                var _style = " style='background-color:" + l_color.bg + ";color:" + l_color.fg + ";'";
            }
            if(window.electCourseTable.lessons({id:lesson.id},{elected:true}).count()>0){
                var newTr =
                    "<tr class='red' id='"+lesson.id+"' onclick='window.electCourseTable.showLessonOnTable(" + lesson.id + ",true)'>"
                    + "<td>" + lesson.no + "</td>" +
                    "<td>"+(null == language || undefined == language || "" == language || "zh" == language ? lesson.teachers : lesson.eng_teachers)+"</td>"+
//						"<td" + _style + ">" + lesson.campusName + "</td>"+
                    "<td" + _style + ">" + (null == language || undefined == language || "" == language || "zh" == language ? lesson.campusName : lesson.campusEngName) + "</td>"+
                    "<td>" + _c.tc + "</td>"+
                    "<td class='stdCount'>" +
                    //"<a href='javascript:void(electCourseTable.thisTurnRemain(" + lesson.id + "));' title='点击查询本轮可选人数'>" +
                    _c.sc + "/" + (_c.lc - _c.rc)+
                    "</a>" +
                    "</td>";
                var arrange = "";
                var activities = lesson.arrangeInfo;
                if(activities.length>0){
                    var weekDays = electCourseTable.config.weekDays;
                    jQuery(activities).each(function(i){
                        if(i != 0) {
                            arrange += "<br/>";
                        }
                        var weekObj = window.weekStateContent(activities[i].weekState, lesson.firstWeek);
                        var stat = "";
//						var stat = ""
//						if(activities[i].weekState=="01010101010101010100000000000000000000000000000000000"){stat="(单)"}
//						else if(activities[i].weekState=="00101010101010101000000000000000000000000000000000000"){stat="(双)"}
                        if(window.isValidOdd(activities[i].weekState)){stat=null == language || undefined == language || "" == language || "zh" == language ? "(单)" : "(ODD)";}
                        else if(window.isValidEven(activities[i].weekState)){stat=null == language || undefined == language || "" == language || "zh" == language ? "(双)" : "(EVEN)";}
                        else {stat =""}
//						arrange += weekDays[activities[i].weekDay-1] +":"+activities[i].startUnit+"-"+activities[i].endUnit+stat+"("+activities[i].rooms+")"+"("+lesson.startWeek+"-"+lesson.endWeek+")";
                        if (null == language || undefined == language || "" == language || "zh" == language) {
                            arrange += weekDays[activities[i].weekDay-1] +":"+activities[i].startUnit+"-"+activities[i].endUnit+stat+"("+activities[i].rooms+")"+"("+weekObj.beginWeek+"-"+weekObj.endWeek+")";
                        } else {
                            arrange += weekDays[activities[i].weekDay-1] +":"+activities[i].startUnit+"-"+activities[i].endUnit+stat+"("+activities[i].eng_rooms+")"+"("+weekObj.beginWeek+"-"+weekObj.endWeek+")";
                        }
                    });
                }else{
//					arrange += "尚未排课";
                    if (null == language || undefined == language || "" == language || "zh" == language) {
                        arrange += "尚未排课";
                    } else {
                        arrange += "Have not selected";
                    }
                }
                newTr += "<td>"+ arrange +"</td>"
                newTr += "<td>" + lesson.remark + "</td>";
                trs += newTr;
            }else{
                if (window.electCourseTable.config.hideWhenFull
                    && !window.electCourseTable.isRetakeCourse('c'+lesson.courseId)
                    && _c.sc >= (_c.lc - _c.rc) ) {
                    return;
                }
                //alert(_c.tr);
                if (window.electCourseTable.config.hideWhenFirstElectFull
                    && !window.electCourseTable.isRetakeCourse('c'+lesson.courseId)
                    && _c.tc == 0 ) {//alert("ddd");
                    return;
                }
                var newTr = "<tr id='"+lesson.id+"' onclick='window.electCourseTable.showLessonOnTable(" + lesson.id + ",true)'>"
                    + "<td>" + lesson.no + "</td>" +
                    "<td>"+(null == language || undefined == language || "" == language || "zh" == language ? lesson.teachers : lesson.eng_teachers)+"</td>"+
                    "<td" + _style + ">" + (null == language || undefined == language || "" == language || "zh" == language ? lesson.campusName:lesson.campusEngName )+ "</td>"+
                    "<td>" + _c.tc + "</td>"+
                    "<td class='stdCount'>" +
                    //	"<a href='javascript:void(electCourseTable.thisTurnRemain(" + lesson.id + "));' title='点击查询本轮可选人数'>" +
                    _c.sc + "/" + (_c.lc - _c.rc) +
                    "</a>" +
                    "</td>";
                var arrange = "";
                var activities = lesson.arrangeInfo;
                if(activities.length>0){
                    var weekDays = electCourseTable.config.weekDays;
                    jQuery(activities).each(function(i){
                        if(i != 0) {
                            arrange += "<br/>";
                        }
                        var weekObj = window.weekStateContent(activities[i].weekState, lesson.firstWeek);
                        var stat = "";
//						var stat = ""
//						if(activities[i].weekState=="01010101010101010100000000000000000000000000000000000"){stat="(单)"}
//						else if(activities[i].weekState=="00101010101010101000000000000000000000000000000000000"){stat="(双)"}
                        if(window.isValidOdd(activities[i].weekState)){stat=null == language || undefined == language || "" == language || "zh" == language ? "(单)" : "(ODD)";}
                        else if(window.isValidEven(activities[i].weekState)){stat=null == language || undefined == language || "" == language || "zh" == language ? "(双)" : "(EVEN)";}
                        else {stat =""}
//						arrange += weekDays[activities[i].weekDay-1] +":"+activities[i].startUnit+"-"+activities[i].endUnit+stat+"("+activities[i].rooms+")"+"("+lesson.startWeek+"-"+lesson.endWeek+")";
                        if (null == language || undefined == language || "" == language || "zh" == language) {
                            arrange += weekDays[activities[i].weekDay-1] +":"+activities[i].startUnit+"-"+activities[i].endUnit+stat+"("+activities[i].rooms+")"+"("+weekObj.beginWeek+"-"+weekObj.endWeek+")";
                        } else {
                            arrange += weekDays[activities[i].weekDay-1] +":"+activities[i].startUnit+"-"+activities[i].endUnit+stat+"("+activities[i].eng_rooms+")"+"("+weekObj.beginWeek+"-"+weekObj.endWeek+")";
                        }
                    });
                }else{
                    arrange += "尚未排课";
                }
                newTr += "<td>"+ arrange +"</td>"
                newTr += "<td>" + lesson.remark + "</td>";
                trs += newTr;
            }

        });
        tbody.append(trs);
    };

    /**************************************************
     * 课表相关功能
     **************************************************/
    // 初始化课表，将已选课程显示在课表中
    ElectCourseTable.prototype.initElectedCourseTable = function(){
        var lessonQuery = this.lessons();
        var electCells = jQuery(this.table).find("tbody tr td.electableCell");

        // 初始化 星期，小节 任务分布图
        var _lessons = lessonQuery.get();
        var _weekDayUnitMap = {};
        for(var w = 1; w <= 7; w++) {
            _weekDayUnitMap["" + w] = {};
            for(var u = 1; u <= 14; u++) {
                _weekDayUnitMap["" + w]["" + u] = [];
            }
        }
        for(var i = 0; i < _lessons.length; i++) {
            var _lesson = _lessons[i];
            for(var j = 0; j < _lesson.arrangeInfo.length; j++) {
                var _activity = _lesson.arrangeInfo[j];
                for(var k = _activity.startUnit; k <= _activity.endUnit; k++) {
                    var lessonInUnit = false;
                    var unitLessons = _weekDayUnitMap["" + _activity.weekDay]["" + k];
                    for(var z = 0; z < unitLessons.length; z++) {
                        if(unitLessons[z].id == _lesson.id) {
                            lessonInUnit = true;
                            break;
                        }
                    }
                    if(!lessonInUnit) {
                        unitLessons.push(_lesson);
                    }
                }
            }
        }
        // 初始化 星期，小节 任务分布图 完毕
        electCells.each(function(index){
            var cell = jQuery(this);
            electCourseTable.initCell(cell,_weekDayUnitMap);
        });

        // 课程代码到任务的map
        this._code2Lessons = {};
        var that = this;
        // 初始化课程代码到任务的map
        this.lessons().each(function (l) {
            var _ls = that._code2Lessons[l.code];
            if(!_ls) {
                _ls = [];
                that._code2Lessons[l.code] = _ls;
            }
            _ls.push(l);
        });
    };



    // 初始化课表单元格，显示已选课程
    ElectCourseTable.prototype.initCell = function(cell, weekDayUnitLessonMap){
        var weekDay = parseInt(cell.attr("weekDay"), 10);
        var unit = parseInt(cell.attr("unit"), 10);
        var _cellLessons = weekDayUnitLessonMap["" + weekDay]["" + unit];
        if(_cellLessons.length > 0){
            var elected = [];

            cell.removeClass("transientOperator");
            cell.removeClass("defaultElected");
            var cssClass;

            var hasRetakeLesson = false;
            var hasConflictLesson = false;
            var weekStates = [];
            //alert(_cellLessons.length);
            for(var z = 0; z < _cellLessons.length; z++){
                var lesson = _cellLessons[z];
                if(lesson.elected==true){
                    elected[elected.length]=lesson;
                }
                if(lesson.elected==lesson.defaultElected) {
                    if(lesson.elected==true){
                        cssClass = "defaultElected";
                        if(global.retake.isRetake(lesson.id)) {
                            hasRetakeLesson = true;
                        }
                        for(var zz = 0; zz < lesson.arrangeInfo.length; zz++) {
                            var activity = lesson.arrangeInfo[zz];
                            if(activity.weekDay == weekDay && activity.startUnit <= unit && unit <= activity.endUnit) {
                                weekStates[weekStates.length] = activity.weekState;
                                break;
                            }
                        };
                    }
                }else{
                    cssClass = "conflictlesson";
                }
            }
            // 重修课的颜色
            if(hasRetakeLesson) {
                global.retake.addStyle(cell);
            } else {
                global.retake.removeStyle(cell);
            }
            // 冲突的颜色
            for(var k = 1; k < weekStates.length; k++) {
                var w1 = weekStates[k - 1];
                var w2 = weekStates[k];
                for(var h = 0; h < w1.length; h++) {
                    if(parseInt(parseInt(w1[h], 10) & parseInt(w2[h], 10)) != 0) {
                        hasConflictLesson = true;
                        break;
                    }
                }
            }
            if(hasConflictLesson) {
                cell.addClass("conflictlesson");
                global.conflict.addStyle(cell);

            } else {
                global.conflict.removeStyle(cell);
            }
            var html = "";
            if(elected.length >0){
                for(var i=0;i<elected.length;i++){
                    var electedLesson = elected[i];
//					html += ((i==0) ? "" : "</br>") + electedLesson.name + "1";
                    if (null == language || undefined == language || "" == language || "zh" == language) {
                        html += ((i==0) ? "" : "</br>") + electedLesson.name;
                    } else {
                        html += ((i==0) ? "" : "</br>") + electedLesson.engName;
                    }
                }
            }
            cell.html(html);
            if(cssClass){
                cell.addClass(cssClass);
            }
        }else{
            cell.removeClass("transientOperator").removeClass("defaultElected");
            cell.html("");
        }
    };






    // 学生点击任务，课表上显示任务的颜色
    ElectCourseTable.prototype.showLessonOnTable = function(lessonId,wherefrom) {
        if(wherefrom){
            if(lessonId != null){
                //已选的课
                var lessonQ = window.electCourseTable.lessons({elected:true});
                //和当前点击的lessonId所对应的不是同一门课程的存在于购物车上的课程
                var courselessons=[];
                //购物车里面添加的课程Id
                var lessons=[];
                //已选的，这次没有被再选的课。
                var oldlessons =[];
                //购物车里所以的课（添加和退的）
                var lessons0 = electCart.operations;
                //已选课程数组
                var choosedcourse = [];
                //和篮子里面有相同的lessonId的数组；
                var unchoosedcourse = [];

                planCourseTable.alllessons = [];
                //这次点击选中的课
                var lesson = window.electCourseTable.lessons({id : lessonId}).first();


                jQuery(window.teachClassTable.table).find("tbody tr").removeClass("lessonAtRightAndLeft");
                jQuery(window.teachClassTable.table).find("#"+lessonId).addClass("lessonAtRightAndLeft");


                window.planCourseTable.showCourses({code:lesson.code}).update({state:"WE"});
                window.planCourseTable.showCourses({code:lesson.code}).update({lessonId:lesson.id});
                window.planCourseTable.showCourses({code:lesson.code}).update({no:lesson.no});
                window.planCourseTable.showCourses({code:lesson.code}).update({teachers:lesson.teachers});

                if(window.electCourseTable.lessons({id:lessonId},{elected:true}).count()>0){
                    window.planCourseTable.showCourses({code:lesson.code}).update({state:"ELE"});
                }

                planCourseTable.refreshChosen();

                jQuery(window.planCourseTable.chosenPlanCoursesTable).find("tbody tr").removeClass("lessonAtRightAndLeft");
                jQuery(window.planCourseTable.chosenPlanCoursesTable).find("#"+lesson.code).addClass("lessonAtRightAndLeft");

                for(var i=0;i<lessons0.length;i++){
                    if(lessons0[i][1]){
                        lessons.push(lessons0[i][0]);

                    }
                }

                //购物车里的课程
                var lessonQ2 = window.electCourseTable.lessons({id : lessons});

                lessonQ.each(function(lessonQ1,i){
                    choosedcourse.push(lessonQ1);
                });

                if (lessonQ2.count()>0){
                    lessonQ2.each(function(lesson12,i){
                        if (lesson.code != lesson12.code){
                            courselessons.push(lesson12.id);}
                        for(var i=0;i<choosedcourse.length;i++){
                            if(choosedcourse[i].code == lesson12.code || choosedcourse[i].code == lesson.code ){
                                unchoosedcourse.push(choosedcourse[i].id);
                            };
                        }
                    })

                    for(var j=0;j<unchoosedcourse.length;j++){
                        for(var i=0;i<choosedcourse.length;i++){
                            if(unchoosedcourse[j] == choosedcourse[i].id){
                                choosedcourse.splice(i,1);
                                i--
                            }
                        }
                    }

                    for(var i=0;i<choosedcourse.length;i++){
                        oldlessons.push(choosedcourse[i].id);
                    }

                }else{
                    lessonQ.each(function(lessonQ1,i){
                        if(choosedcourse[i].code != lesson.code){
                            oldlessons.push(lessonQ1.id);
                        }
                    });
                }



                //添加已选的但是和所选的课程code不一样的课程
                for(var k=0;k<oldlessons.length;k++){
                    planCourseTable.alllessons.push(oldlessons[k]);
                }

                //添加购物车上和现在所选的课程的code不一样的课程
                for(var k=0 ;k<courselessons.length;k++){
                    planCourseTable.alllessons.push(courselessons[k]);
                }
                oldlessons = [];
                courselessons = [];
                if(window.electCourseTable.config.cannotWithDrawThisTurn){
                    var course = window.planCourseTable.showCourses({lessonId:lessonId}).first();
                    if(course.turn == window.planCourseTable.electTurn){
                        electCart.distinct(lessonId);
                        electCart.elect(lessonId);
                    }
                }else{
                    electCart.distinct(lessonId);
                    electCart.elect(lessonId);
                }
            }

        }else if (!wherefrom){

            planCourseTable.alllessons =[];

            var lessons0 = electCart.operations;
            for(var i=0;i<lessons0.length;i++){
                if(lessons0[i][1]){
                    planCourseTable.alllessons.push(lessons0[i][0]);
                }
            }

            window.electCourseTable.lessons({elected:true}).each(function(lesson,i){
                planCourseTable.alllessons.push(lesson.id);
            })

        }


        //清除课表
        jQuery(window.electCourseTable.table).find("tbody tr td.electableCell").empty();
        //在课表上添加课程

        //为检查冲突而创建的数组
        var forconflict = [];
        window.planCourseTable.conflictlessons = [];


        for(var i=0;i<planCourseTable.alllessons.length;i++){
            forconflict.push(planCourseTable.alllessons[i]);
        };

        for(var j=0 ;j<planCourseTable.alllessons.length;j++){
            var lesson = planCourseTable.alllessons[j];
            var _lesson1 = window.electCourseTable.lessons({id : parseInt(lesson, 10) }).first();
            for(var k=0;k<forconflict.length;k++){
                var _lesson2 = window.electCourseTable.lessons({id : parseInt(forconflict[k], 10) }).first();
                if (electCourseTable.isConflict(_lesson1,_lesson2)&& _lesson1.id!=_lesson2.id){
                    planCourseTable.conflictlessons.push(forconflict[k]);
                    forconflict.splice(k,1);
                    k--;
                }
            }
        }
        jQuery(window.electCourseTable.table).find("tbody tr td.lessonOnTable").removeClass("lessonOnTable");
        jQuery(window.electCourseTable.table).find("tbody tr td.conflictlesson").removeClass("conflictlesson");

        for(var k=0 ;k<planCourseTable.alllessons.length;k++){
            lesson = planCourseTable.alllessons[k]
            var _lesson1 = window.electCourseTable.lessons({id : parseInt(lesson, 10) }).first();
            for(var i = 0; i < _lesson1.arrangeInfo.length; i++) {
                var activity = _lesson1.arrangeInfo[i];
                var weekDay = activity.weekDay;
                var weekObj = window.weekStateContent(activity.weekState, _lesson1.firstWeek);
                var state = "";
//					var state = ""
//					if(activity.weekState=="01010101010101010100000000000000000000000000000000000"){state="(单)"}
//					else if(activity.weekState=="00101010101010101000000000000000000000000000000000000"){state="(双)"}
                if(window.isValidOdd(activity.weekState)){state=null == language || undefined == language || "" == language || "zh" == language ? "(单)" : "(ODD)";}
                else if(window.isValidEven(activity.weekState)){state=null == language || undefined == language || "" == language || "zh" == language ? "(双)" : "(EVEM)";}
                else {state =""}
                for(var j = activity.startUnit; j <= activity.endUnit; j++) {
//						jQuery(window.electCourseTable.table).find("tbody tr td.electableCell[weekDay=" + weekDay + "][unit=" + j + "]").append(_lesson1.name+state+"("+_lesson1.startWeek+"-"+_lesson1.endWeek+")" +"   ");
//						jQuery(window.electCourseTable.table).find("tbody tr td.electableCell[weekDay=" + weekDay + "][unit=" + j + "]").append(_lesson1.name+state+"("+weekObj.beginWeek+"-"+weekObj.endWeek+")" +"   ");
                    if (null == language || undefined == language || "" == language || "zh" == language) {
                        jQuery(window.electCourseTable.table).find("tbody tr td.electableCell[weekDay=" + weekDay + "][unit=" + j + "]").append(_lesson1.name+state+"("+weekObj.beginWeek+"-"+weekObj.endWeek+")" +"   ");
                    } else {
                        jQuery(window.electCourseTable.table).find("tbody tr td.electableCell[weekDay=" + weekDay + "][unit=" + j + "]").append(_lesson1.engName+state+"("+weekObj.beginWeek+"-"+weekObj.endWeek+")" +"   ");
                    }
                }
            }
        }

        var lessonconflict = window.electCourseTable.lessons(arrangePredicate( { weekDay:jQuery("tbody tr td.electableCell").attr("weekDay"), unit:jQuery("tbody tr td.electableCell").attr("unit") } ))
            .filter({ id:planCourseTable.allllessons});
        if(lessonconflict.count()>1){lessonconflct.addClass("conflictlesson")}

        for(var k=0 ;k<planCourseTable.conflictlessons.length;k++){
            lesson = planCourseTable.conflictlessons[k]
            var _lesson1 = window.electCourseTable.lessons({id : parseInt(lesson, 10) }).first();
            for(var i = 0; i < _lesson1.arrangeInfo.length; i++) {
                var activity = _lesson1.arrangeInfo[i];
                var weekDay = activity.weekDay;
                for(var j = activity.startUnit; j <= activity.endUnit; j++) {
                    var skdkskd = window.electCourseTable.lessons(arrangePredicate( { weekDay:weekDay, unit:j } )).filter({ id:planCourseTable.conflictlessons});
                    if(skdkskd.count()>1){
                        jQuery(window.electCourseTable.table).find("tbody tr td.electableCell[weekDay=" + weekDay + "][unit=" + j + "]").addClass("conflictlesson");
                    }
                }
            }
        }


        //添加现在所选的课程，并着色

        if (lessonId != null) {
            var testconflict =[]
            var ifconflict = false
            var _lesson = window.electCourseTable.lessons({id : parseInt(lessonId, 10) }).first();
            planCourseTable.alllessons.push(_lesson.id);

            for(var j=0 ;j<planCourseTable.alllessons.length;j++){
                var lesson = planCourseTable.alllessons[j];
                var _lesson1 = window.electCourseTable.lessons({id : parseInt(lesson, 10) }).first();

                if (electCourseTable.isConflict(_lesson,_lesson1)&& _lesson1.id!=_lesson.id){
                    planCourseTable.conflictlessons.push(_lesson1);
                    ifconflict = true ;
                }
            }


            for(var i = 0; i < _lesson.arrangeInfo.length; i++) {
                var activity = _lesson.arrangeInfo[i];
                var weekDay = activity.weekDay;
                var weekObj = window.weekStateContent(activity.weekState, _lesson.firstWeek);
                var state = "";
//				var state = ""
//					if(activity.weekState=="01010101010101010100000000000000000000000000000000000"){state="(单)"}
//					else if(activity.weekState=="00101010101010101000000000000000000000000000000000000"){state="(双)"}
                if(window.isValidOdd(activity.weekState)){state=null == language || undefined == language || "" == language || "zh" == language ? "(单)" : "(ODD)";}
                else if(window.isValidEven(activity.weekState)){state=null == language || undefined == language || "" == language || "zh" == language ? "(双)" : "(EVEN)";}
                else {state =""}
                for(var j = activity.startUnit; j <= activity.endUnit; j++) {
                    var skdkskd = window.electCourseTable.lessons(arrangePredicate( { weekDay:weekDay, unit:j } )).filter({ id:planCourseTable.alllessons});
//					jQuery(window.electCourseTable.table).find("tbody tr td.electableCell[weekDay=" + weekDay + "][unit=" + j + "]").append("<br>"+_lesson.name+state+"("+_lesson.startWeek+"-"+_lesson.endWeek+")");
                    if (null == language || undefined == language || "" == language || "zh" == language) {
                        jQuery(window.electCourseTable.table).find("tbody tr td.electableCell[weekDay=" + weekDay + "][unit=" + j + "]").append("<br>"+_lesson.name+state+"("+weekObj.beginWeek+"-"+weekObj.endWeek+")");
                    } else {
                        jQuery(window.electCourseTable.table).find("tbody tr td.electableCell[weekDay=" + weekDay + "][unit=" + j + "]").append("<br>"+_lesson.engName+state+"("+weekObj.beginWeek+"-"+weekObj.endWeek+")");
                    }
                    if(ifconflict && skdkskd.count()>1){
                        jQuery(window.electCourseTable.table).find("tbody tr td.electableCell[weekDay=" + weekDay + "][unit=" + j + "]").addClass("conflictlesson");
                        jQuery(window.electCourseTable.table).find("tbody tr td.electableCell[weekDay=" + weekDay + "][unit=" + j + "]").addClass("lessonOnTable");
                    }else{
                        jQuery(window.electCourseTable.table).find("tbody tr td.electableCell[weekDay=" + weekDay + "][unit=" + j + "]").addClass("lessonOnTable");
                    }
                }
            }
            if(window.electCourseTable.config.cannotWithDrawThisTurn){
                var course = window.planCourseTable.showCourses({lessonId:lessonId}).first();
                if(course.turn != window.planCourseTable.electTurn){
                    return;
                }
            }
            //在购物篮里添加  已选课程的退课信息
            var lessonchoose = window.electCourseTable.lessons({id : lessonId}).first();
            var lessonQuery1 = window.electCourseTable.lessons({code:lessonchoose.code,elected:true});
            if(lessonQuery1.count()>0){
                window.electCart.distinct(lessonId);
                window.electCart.changeLessons(lessonId);

            }
        }
    };



    // 选课购物车
    function ElectCart() {
        jQuery(window.electCourseTable.table).find("tbody tr td.electableCell")
            .mouseover(
                function(){
                    var lesson = window.electCourseTable.lessons(arrangePredicate( { weekDay:jQuery(this).attr("weekDay"), unit:jQuery(this).attr("unit") } ))
                        .filter({ elected:true})
                    if (lesson.count()>0){
                        var msg=""
                        lesson.each(function(lesson1){
//							msg += lesson1.no+" "+lesson1.name+" "+lesson1.teachers+"<br>";
                            if (null == language || undefined == language || "" == language || "zh" == language) {
                                msg += lesson1.no+" "+lesson1.name+" "+lesson1.teachers+"<br>";
                            } else {
                                msg += lesson1.no+" "+lesson1.engName+" "+lesson1.teachers+"<br>";
                            }
                            //toolTip();
                        })
                        toolTip(msg,'#000000', '#FFFF00',250);
                    }
                }
            )
            .mouseout(function() {toolTip()})
            .dblclick(
                function(){
                    window.planCourseTable.searchPublicCourses();

                    window.electCourseTable.lessons({elected:true}).each(function(lesson,i){
                        for(var j=0;j<planCourseTable.publicchooselessons.length;j++){
                            var allpule = planCourseTable.publicchooselessons[j];
                            if (allpule.code == lesson.code){
                                planCourseTable.publicchooselessons.splice(j,1);
                                j--;
                            }
                        }
                    })
                    var ids = [];
                    for(var j=0;j<planCourseTable.publicchooselessons.length;j++){
                        ids.push(planCourseTable.publicchooselessons[j].courseId);
                    }

                    var lesson = window.electCourseTable.lessons(arrangePredicate( { weekDay:jQuery(this).attr("weekDay"), unit:jQuery(this).attr("unit") } ))
                        .filter({courseId:ids})
                    var trs = "";
                    if (lesson.count()>0){
                        lesson.each(function(lesson1,i){
                            if (!window.planCourseTable.showCourses({id:lesson1.courseId}).count()>0){
                                var _c = window.lessonId2Counts["" + lesson1.id];

                                // 校区的颜色
                                var l_color = window.campusCodes[lesson1.campusCode];
                                var _style = "";
                                if(l_color) {
                                    var _style = " style='background-color:" + l_color.bg + ";color:" + l_color.fg + ";'";
                                }

                                if (window.electCourseTable.config.hideWhenFull
                                    && !window.electCourseTable.isRetakeCourse('c'+lesson1.courseId)
                                    && _c.sc >= (_c.lc - _c.rc) ) {
                                    return;
                                }
                                if (window.electCourseTable.config.hideWhenFirstElectFull
                                    && !window.electCourseTable.isRetakeCourse('c'+lesson.courseId)
                                    && _c.tc == 0 ) {
                                    return;
                                }
                                var newTr = "<tr>"
                                    + "<td><input type='radio' name='teachClass' value='" + lesson1.id + "'/></td>"
                                    + "<td>" + lesson1.no + "</td>" +
//														"<td>" + lesson1.name + "</td>" +
                                    "<td>" + (null == language || undefined == language || "" == language || "zh" == language ? lesson1.name : lesson1.engName) + "</td>" +
                                    "<td>" + lesson1.teachers + "</td>" +
//										"<td" + _style + ">" + lesson1.campusName + "</td>"+
                                    "<td" + _style + ">" + (null == language || undefined == language || "" == language || "zh" == language ? lesson1.campusName : lesson1.campusEngName) + "</td>"+
                                    "<td class='stdCount'>" +
                                    //	"<a href='javascript:void(electCourseTable.thisTurnRemain(" + lesson1.id + "));' title='点击查询本轮可选人数'>" +
                                    _c.sc + "/" + (_c.lc - _c.rc) +
                                    "</a>" +
                                    "</td>";
                                var arrange = "";
                                var activities = lesson1.arrangeInfo;
                                if(activities.length>0){
                                    var weekDays = electCourseTable.config.weekDays;
                                    jQuery(activities).each(function(i){
                                        if(i != 0) {
                                            arrange += "<br/>";
                                        }
                                        var stat = "";
//										var stat = ""
//										if(activities[i].weekState=="01010101010101010100000000000000000000000000000000000"){stat="(单)"}
//										else if(activities[i].weekState=="00101010101010101000000000000000000000000000000000000"){stat="(双)"}
                                        if(window.isValidOdd(activities[i].weekState)){stat=null == language || undefined == language || "" == language || "zh" == language ? "(单)" : "(ODD)";}
                                        else if(window.isValidEven(activities[i].weekState)){stat=null == language || undefined == language || "" == language || "zh" == language ? "(双)" : "(EVEN)";}
                                        else {stat =""}
                                        arrange += weekDays[activities[i].weekDay-1] +":"+activities[i].startUnit+"-"+activities[i].endUnit+stat+"("+activities[i].rooms+")";
                                        if (null == language || undefined == language || "" == language || "zh" == language) {
                                            arrange += weekDays[activities[i].weekDay-1] +":"+activities[i].startUnit+"-"+activities[i].endUnit+stat+"("+activities[i].rooms+")";
                                        } else {
                                            arrange += weekDays[activities[i].weekDay-1] +":"+activities[i].startUnit+"-"+activities[i].endUnit+stat+"("+activities[i].eng_rooms+")";
                                        }
                                    });
                                }else{
//									arrange += "尚未排课";
                                    if (null == language || undefined == language || "" == language || "zh" == language) {
                                        arrange += "尚未排课";
                                    } else {
                                        arrange += "Have not selected";
                                    }
                                }
                                newTr += "<td>"+ arrange +"</td>"
                                newTr += "<td>" + lesson1.remark + "</td>";
                                trs += newTr;
                            }

                        })
                    }
                    planCourseTable.newneedCourses.find("tbody").html("");
                    planCourseTable.newneedCourses.find("tbody").append(trs);

                    //点击行选定
                    planCourseTable.newneedCourses.find("tr").click(function(evt){
                        if(jQuery(evt.target).is(":radio")) return;
                        var cbx = jQuery("td:first-child :radio", this);
                        if(!cbx[0]) { return; }
                        if(cbx.is(":checked")) { cbx.removeAttr("checked"); }
                        else { cbx.attr("checked", "checked"); }
                    });


//					var _title = "可选择的课程&nbsp;&nbsp;";
//					_title += "<input type='button' onclick='window.planCourseTable.Ok6();' value='确定'/>";
                    var _title = "";
                    if (null == language || undefined == language || "" == language || "zh" == language) {
                        _title = "可选择的课程&nbsp;&nbsp;";
                        _title += "<input type='button' onclick='window.planCourseTable.Ok6();' value='确定'/>";
                    } else {
                        _title = "Courses Available&nbsp;&nbsp;";
                        _title += "<input type='button' onclick='window.planCourseTable.Ok6();' value='OK'/>";
                    }
                    jQuery.colorbox({transition:'none', overClose:false, width:"700px", inline:true, href:"#newneedCourses", title:_title });

                }
            )
    };


    PlanCourseTable.prototype.Ok6 = function(){
        var that = this;
        this.newneedCourses.find("tbody :radio:checked").each(function(i, ele) {
            var course =  window.electCourseTable.lessons({id:parseInt(ele.value,10)}).first()

//			   		that.showCourses.insert({id:course.courseId,name:course.name,code:course.code,lessonId:course.id,credits:course.credits,teachers:course.teachers,canApply:false,no:course.no,turn:that.electTurn,state:"WE"})
            if (null == language || undefined == language || "" == language || "zh" == language) {
                that.showCourses.insert({id:course.courseId,name:course.name,code:course.code,lessonId:course.id,credits:course.credits,teachers:course.teachers,canApply:false,no:course.no,turn:that.electTurn,state:"WE"});
            } else {
                that.showCourses.insert({id:course.courseId,name:course.engName,code:course.code,lessonId:course.id,credits:course.credits,teachers:course.teachers,canApply:false,no:course.no,turn:that.electTurn,state:"WE"});
            }
            electCourseTable.showLessonOnTable(course.id,true)
        });

        this.refreshChosen();
        jQuery.colorbox.close();
    }


    ElectCart.prototype.operations = [];
    //选课
    ElectCart.prototype.elect = function(lessonId) {
        var arr=[];
        arr.push(lessonId);
        arr.push(true);
        electCart.operations.push(arr);
    };

    //换课
    ElectCart.prototype.changeLessons = function(lessonId) {
        var arr=[]
        var lessonNew = window.electCourseTable.lessons({id : lessonId}).first();
        var lessonOld = window.electCourseTable.lessons({code:lessonNew.code,elected:true}).first();
        arr.push(lessonId);
        arr.push(lessonOld.id);
        arr.push('ex');
        electCart.operations.push(arr);
    }

    //退课
    ElectCart.prototype.withdraw = function(lessonId) {
        var arr=[];
        arr.push(lessonId);
        arr.push(false);
        electCart.operations.push(arr);
    };

    //购物车里去掉于选择Lesson相同courseCode 的lessonId
    ElectCart.prototype.distinct = function(lessonId) {
        var lesson = window.electCourseTable.lessons({id : lessonId}).first();
        var coursecode = lesson.code;
        for(var i=0; i<electCart.operations.length;i++){
            var lesson2 = window.electCourseTable.lessons({id : electCart.operations[i][0]}).first();
            if (lesson2.code == coursecode  ){
                electCart.operations.splice(i,1);
                i--;
            }
        }
    };

    //购物车里去掉与选择lesson相同的lessonId
    ElectCart.prototype.distinct2 = function(lessonId){
        for (var i=0; i<electCart.operations.length;i++){
            if(electCart.operations[i][0] == lessonId){
                electCart.operations.splice(i,1);
                i--;
            }
        }
    }

    ElectCart.prototype.clear = function() {
        electCart.operations = [];
    };
});