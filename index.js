var self = require('sdk/self');
var notifications = require("sdk/notifications");
var clipboard = require("sdk/clipboard");
var preferences = require("sdk/simple-prefs").prefs;
var { indexedDB, IDBKeyRange } = require('sdk/indexed-db');
var { ActionButton } = require("sdk/ui/button/action");
const { ToggleButton } = require("sdk/ui/button/toggle");
const pageMod = require("sdk/page-mod");
const tabs = require("sdk/tabs");
const panels = require("sdk/panel");
const {Cc,Ci,Cm,Cu,components} = require("chrome");
var chrome = require('chrome');
var prompts = chrome.Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(chrome.Ci.nsIPromptService);
Cu.import("resource://gre/modules/XPCOMUtils.jsm", this);
Cu.import("resource://gre/modules/RemotePageManager.jsm");
Cu.import("resource://gre/modules/Services.jsm", this);

var PouchDB = require('./lib/pouchdb-4.0.0.js');



var ratIcon = self.data.url("./images/icon-32.png");
var cheeseIcon = self.data.url("./images/cheese-32.png");


var rats_button = ToggleButton({
  id: "rats-log",
  label: "RATS",
  badge: "",
  badgeColor: "#00AAAA",
  icon: {
    "16": "./images/icon-16.png",
    "32": "./images/icon-32.png",
    "64": "./images/icon-64.png"
  },
  //onClick: handleClick
  onChange: handleChange
});



var myScript = "window.addEventListener('click', function(event) {" +
               "  var t = event.target;" +
               "  var clicky = t.id;" +
               "  if (t.nodeName == 'BUTTON')" +
               "    self.port.emit('click_link', clicky);" +
               "}, false);";
               
var rat_panel = panels.Panel({
    width: 230,
    height: 205,
    contentURL: "./panel.html",
    onHide: handleHide,
    contentScript: myScript
});

var man_add_panel = panels.Panel({
    width: 230,
    height: 245,
    contentURL: "./add_panel.html",
    onHide: handleHide2,
    contentScriptFile: ["./js/jquery-1.10.2.js",
                      "./js/typeahead.bundle.js",
                      "./js/addpanel.js"] 
});

man_add_panel.on("show", function() {
    man_add_panel.port.emit("show");
});

function handleChange(state) {
  if (state.checked) {
    rats_button.badgeColor = "#00AAAA";
    rat_panel.show({
      position: rats_button
    });
  }
  else {
    rats_button.badgeColor = "#AA00AA";
  }
}

function getWeekNumber(d) {
    // Copy date so don't modify original
    d = new Date(+d);
    d.setHours(0,0,0);
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    d.setDate(d.getDate() + 4 - (d.getDay()||7));
    // Get first day of year
    var yearStart = new Date(d.getFullYear(),0,1);
    // Calculate full weeks to nearest Thursday
    var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
    // Return array of year and week number
    //return [d.getFullYear(), weekNo];
    return weekNo;
}

function handleHide() {
    rats_button.state('window', {checked: false});
    rat_panel.hide();
}

function handleHide2() {
    man_add_panel.hide();
}

function updateBadge() {
    var theDate = new Date();
    var theDate2 = theDate.toJSON()
    var week = getWeekNumber(theDate);
    
    //Return start of the week
    var startDate = new Date(theDate.getFullYear(),theDate.getMonth(),theDate.getDate() - (theDate.getDay() + 1)).toJSON();

    //Retrieve all docs with same week and year
    var db = new PouchDB('RATS');
    var options = {startkey : startDate, endkey : theDate2, include_docs : true};
    var weeklyHours = 0;
    db.allDocs(options, function (err, response) {
        if (response && response.rows.length > 0) {
          //Separate into variables
            for (var i=0;i<response.rows.length;i++) {
                var rat_data = JSON.stringify(response.rows[i].doc)
                var rat_data_parsed = JSON.parse(rat_data);
                var num = i;
                weeklyHours = weeklyHours + Number(rat_data_parsed.hours);
            }
        }
        //Update badge
        rats_button.badge = weeklyHours;
        rats_button.badgeColor = "#AA00AA";
        
      // handle err or response
    });
}

rat_panel.port.on("click_link", function (text) {
    if (text == "vLog") {
        tabs.open({
            url: "about:ratslog",
            isPinned: true,
            inNewWindow: false,
            inBackground: false
        });
    }
    else if (text == "uLog") {
        man_add_panel.show({
          position: rats_button
        });
        //Reload ratslog page if open?
    }
    else if (text == "rENT") {
        var theDate = new Date();
        var week = getWeekNumber(theDate);
        var check = {value: false};                  // default checkbox to false
        var input = {value: week};                  // default edit field
        week = prompts.prompt(null, 'Week Number?', 'Please enter the week number to retrieve', input, null, check);
        //input.value holds the value of the edit field if "OK" was pressed.
        if (week) {
            var db = new PouchDB('RATS');
            var options = {startkey : startDate, endkey : theDate2, include_docs : true};
            db.allDocs(options, function (err, response) {
                if (response && response.rows.length > 0) {
                  //Separate into variables
                    var num = 0;
                    for (var i=0;i<response.rows.length;i++) {
                        var rat_data = JSON.stringify(response.rows[i].doc)
                        var rat_data_parsed = JSON.parse(rat_data);
                        num = i;
                        var project  = rat_data_parsed.rats;
                        var job      = rat_data_parsed.job;
                        var task     = rat_data_parsed.desc;
                        var hours    = rat_data_parsed.hours;
                        
                        var num = new Array(project, job, task, hours);
                    }
                }
//Try creating an array of the IDs then loop through that array pulling only each value when needed?
            });
                
            //Copy first item to clipboard
            
            notifications.notify({
                title: "RATS Tracker",
                text: "First RATS # copied to clipboard, ready to paste",
                iconURL: ratIcon
            });
            
            var quickRats = ActionButton({
                id: "quick-rats-button",
                label: "Quick Rats",
                icon: {
                  "16": "./images/cheese-16.png",
                  "32": "./images/cheese-32.png"
                },
                onClick: function(state) {
                    //Copy next value to clipboard
                    
                    
                    //console.log("button '" + state.label + "' was clicked");
                    
                    //Copy last value, prompt and close button
                    //quickRats.destroy();
                }
              });
        } else {
            notifications.notify({
                title: "RATS Tracker",
                text: "RATS entry mode cancelled!",
                iconURL: ratIcon
            });
        }
        
    }
    else if (text == "exp") {
        //Save data to some format on desktop?
    }
    else {
        //Something is wrong
    } 
    handleHide();
});

man_add_panel.port.on("man_add", function (job, rats, desc, hours) {
    var theDate = new Date();
    var db = new PouchDB('RATS');
    var doc = {
      "_id": new Date().toJSON(),
      "rats": rats,
      "job": job,
      "week": getWeekNumber(theDate),
      "desc": desc, 
      "hours": hours
    };
    db.put(doc);

    handleHide2();
    
    notifications.notify({
        title: "RATS Tracker",
        text: "Job " + job + " [" + hours + " hours] added to RATS log.",
        iconURL: ratIcon
    });
    
    updateBadge();
});

pageMod.PageMod({
    include: ["http://pafoap01:8888/pls/prod/ece_ewo_web.ece_ewo_page?in_ewr_no=EWS*", "http://pafoap01:8888/pls/prod/ece_ewo_web.ece_ewo_page?in_ewr_id=*"],
    contentScriptWhen: 'end',
    contentScriptFile: './js/rats-ews.js',
    onAttach: function(worker) {
        worker.port.on("defhour", function() {  
            var hour = preferences.defHour;
            worker.port.emit("rtnhour", hour);
        });

        worker.port.on("add", function(EWS, hours) {            
            var theDate = new Date(); //today

            // Old ID  "_id": "RAT:" + new Date().toJSON(),
            var db = new PouchDB('RATS');
            var doc = {
              "_id": new Date().toJSON(),
              "rats": "",
              "job": "EWS" + EWS,
              "week": getWeekNumber(theDate),
              "desc": "", 
              "hours": hours
            };
            db.put(doc);
            
            //Reports what was saved
            //db.get(doc._id).then(function(doc) {
            //    console.error(doc);
            //});
               
            notifications.notify({
                title: "RATS Tracker",
                text: "EWS " + EWS + " [" + hours + " hours] added to RATS log.",
                iconURL: ratIcon
            });
            updateBadge();
        });
        
    }
});

let RATsLog = new RemotePages("about:ratslog");
var db = new PouchDB('RATS'); 

RATsLog.addMessageListener("ready", function() {
    var options = {include_docs: true};

    db.allDocs(options, function (err, response) {

    if (response && response.rows.length > 0) {
      //Separate into variables
        for (var i=0;i<response.rows.length;i++) {
            var rat_data = JSON.stringify(response.rows[i].doc)
            var rat_data_parsed = JSON.parse(rat_data);
            var num = i;
            var newText_1  = rat_data_parsed._id;
            var newText_2  = rat_data_parsed.rats;
            var newText_3  = rat_data_parsed.job;
            var newText_4  = rat_data_parsed.week;
            var newText_5  = rat_data_parsed.desc;
            var newText_6  = rat_data_parsed.hours;
            
            var array = new Array(num, newText_1, newText_2, newText_3, newText_4, newText_5, newText_6);
            RATsLog.sendAsyncMessage("addRow", array);
        }
    }
    // handle err or response
    //console.error(err);
  });
});

RATsLog.addMessageListener("updateDesc", function(array) {
    var descArray = array.data;
    var id = descArray[0];
    var note = descArray[1];
    
    db.get(id).then(function (doc) {
      // update description
      doc.desc = note;
      // put it back
      return db.put(doc);
    }).then(function () {
      // fetch doc again
      //return db.get(id);
    }).then(function (doc) {
      //console.log(doc);
    });
});

RATsLog.addMessageListener("updateHour", function(array) {
    var hourArray = array.data;
    var id = hourArray[0];
    var hour = hourArray[1];
      
    db.get(id).then(function (doc) {
      doc.hours = hour;
      return db.put(doc);
    });
});

RATsLog.addMessageListener("updateRats", function(array) {
    var ratsArray = array.data;
    var id = ratsArray[0];
    var rat = ratsArray[1];
      
    db.get(id).then(function (doc) {
      doc.rats = rat;
      return db.put(doc);
    });
});

RATsLog.addMessageListener("updateJob", function(array) {
    var jobArray = array.data;
    var id = jobArray[0];
    var job = jobArray[1];
      
    db.get(id).then(function (doc) {
      doc.job = job;
      return db.put(doc);
    });
});

RATsLog.addMessageListener("updateWeek", function(array) {
    var jobArray = array.data;
    var id = jobArray[0];
    var week = jobArray[1];
      
    db.get(id).then(function (doc) {
      doc.week = week;
      return db.put(doc);
    });
});

const aboutRATSLogContract = "@mozilla.org/network/protocol/about;1?what=ratslog";
const aboutRATSLogDescription = "About RATS Log";
const aboutRATSLogUUID = components.ID("6a3897f0-3ba3-11e5-b970-0800200c9a66");
// about:ratslog factory
let aboutRATSLogFactory = {
    createInstance: function(outer, iid) {
        if (outer !== null)
            throw Cr.NS_ERROR_NO_AGGREGATION;

        return aboutRATSLog.QueryInterface(iid);
    }
};

// about:ratslog
let aboutRATSLog = {
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),

    getURIFlags: function(aURI) {
        return Ci.nsIAboutModule.ALLOW_SCRIPT;
    },

    newChannel: function(aURI) {
        if (aURI.spec != "about:ratslog")
            return;

        let uri = Services.io.newURI("resource://RatsTracker-at-tenneco-dot-com/data/ratslog.html", null, null);
        return Services.io.newChannelFromURI(uri);
    }
};
Cm.QueryInterface(Ci.nsIComponentRegistrar).
registerFactory(aboutRATSLogUUID, aboutRATSLogDescription, aboutRATSLogContract, aboutRATSLogFactory);