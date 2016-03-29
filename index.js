var self = require('sdk/self');
var notifications = require("sdk/notifications");
var clipboard = require("sdk/clipboard");
var preferences = require("sdk/simple-prefs").prefs;
//var { indexedDB, IDBKeyRange } = require('sdk/indexed-db');
var { ActionButton } = require("sdk/ui/button/action");
const { ToggleButton } = require("sdk/ui/button/toggle");
const pageMod = require("sdk/page-mod");
const tabs = require("sdk/tabs");
const panels = require("sdk/panel");
const sys = require('sdk/system');
const sidebars = require("sdk/ui/sidebar");
const {Cc,Ci,Cm,Cu,components} = require("chrome");
const { defer } = require('sdk/core/promise');
const { OS, TextEncoder, TextDecoder } = Cu.import("resource://gre/modules/osfile.jsm", {});
var chrome = require('chrome');
var prompts = chrome.Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(chrome.Ci.nsIPromptService);
Cu.import("resource://gre/modules/XPCOMUtils.jsm", this);
Cu.import("resource://gre/modules/RemotePageManager.jsm");
Cu.import("resource://gre/modules/Services.jsm", this);

var PouchDB = require('./lib/pouchdb-5.2.1.js');
var db = new PouchDB('RATS');

var ratIcon = self.data.url("./images/icon-64.png");
var cheeseIcon = self.data.url("./images/cheese-32.png");

exports.main = function(options, callbacks) {
    if (options.loadReason == "install") {
        factory = new Factory(AboutRATS);
        registerRemotePage();
    } else if (options.loadReason == "startup") {
        factory = new Factory(AboutRATS);
        registerRemotePage();
    } else if (options.loadReason == "upgrade") {
        //factory = new Factory(AboutRATS);
    }
}

exports.onUnload = function (reason) {
    if (reason == "shutdown") {
        factory.unregister();
        RemotePageManager.removeRemotePageListener("about:ratslog");
    }
};

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
    contentScriptFile: ["./js/jquery-2.2.1.min.js",
                      "resource://RatsTracker-at-tenneco-dot-com/lib/typeahead.bundle.js",
                      "./js/addpanel.js"] 
});

var rats_entry_sidebar = sidebars.Sidebar({
  id: 'quick-rats',
  title: 'Rats Entry Mode',
  url: "./rats_entry_sidebar.html",
  onAttach: function (worker) {
        //var db = new PouchDB('RATS');
        worker.port.on("copy", function(value) {
            var clipboard = require("sdk/clipboard");
            clipboard.set(value);            
        });
        
        worker.port.on("loaded", function() {
            var theDate = new Date();
            var endDate = theDate.toJSON();

            var lastMms = theDate.getTime() - (1000*60*60*24*28); // Offset by 4w - 28 days;
            theDate.setTime( lastMms );
            var startDate = new Date(theDate.getFullYear(),theDate.getMonth(),theDate.getDate()).toJSON();

            //Retrieve all docs with same week and year
            //var db = new PouchDB('RATS');
            var options = {startkey : startDate, endkey : endDate, include_docs : true};
            db.allDocs(options, function (err, response) {
                if (response && response.rows.length > 0) {
                  //Separate into variables
                    for (var i=0;i<response.rows.length;i++) {
                        var rat_data = JSON.stringify(response.rows[i].doc);
                        var rat_data_parsed = JSON.parse(rat_data);
                        var num = i;
                        var newText_2  = rat_data_parsed.rats;
                        var newText_3  = rat_data_parsed.ews;
                        var newText_4  = rat_data_parsed.week;
                        var newText_5  = rat_data_parsed.desc;
                        var newText_6  = rat_data_parsed.hours;
                        
                        var array = new Array(num, newText_2, newText_3, newText_4, newText_5, newText_6);
                        worker.port.emit("update", array);
                    }
                }
            });
        });
                
        worker.port.on("chgTableData", function(from, to) {
            //Set hours at end of day to capture all jobs
            var end = new Date(to);
            end.setHours(23,59,59,999);
            
            //var db = new PouchDB('RATS'); 
            var options = {startkey : from, endkey : end.toJSON(), include_docs : true};
            db.allDocs(options, function (err, response) {
                if (response && response.rows.length > 0) {
                //Separate into variables
                for (var i=0;i<response.rows.length;i++) {
                    var rat_data = JSON.stringify(response.rows[i].doc);
                    var rat_data_parsed = JSON.parse(rat_data);
                    var num = i;
                    var newText_2  = rat_data_parsed.rats;
                    var newText_3  = rat_data_parsed.ews;
                    var newText_4  = rat_data_parsed.week;
                    var newText_5  = rat_data_parsed.desc;
                    var newText_6  = rat_data_parsed.hours;
                    
                    var array = new Array(num, newText_2, newText_3, newText_4, newText_5, newText_6);
                    worker.port.emit("update", array);
                }
            }
            //console.error(err);
            });
        });
  },
  onShow: function () {
    //console.log("showing");
  },
  onHide: function () {
    //console.log("hiding");
  },
  onDetach: function () {
    //console.log("detaching");
  }
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
    var theDate2 = theDate.toJSON();
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
                var rat_data = JSON.stringify(response.rows[i].doc);
                var rat_data_parsed = JSON.parse(rat_data);
                var num = i;
                weeklyHours = weeklyHours + Number(rat_data_parsed.hours);
            }
        }
        //Update badge
        var startDate2 = new Date(startDate);
        var timeDiff = Math.abs(theDate.getTime() - startDate2.getTime());
        var diffHours = (Math.ceil(timeDiff / 3.6e6)-48)*0.3333; //-48 to get mon, *.333 to get 8 hours per day (start date is Sat)
        rats_button.badge = weeklyHours;
        if (diffHours - weeklyHours <= 1) {
            rats_button.badgeColor = "#009900";
        } else if (diffHours - weeklyHours < 8 && diffHours - weeklyHours > 1) {
            rats_button.badgeColor = "#b2b200";
        } else {
            rats_button.badgeColor = "#ff0000";
        }

      // handle err or response
    });
}

function openAndReuseOneTabPerURL(url) {
  var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
                     .getService(Ci.nsIWindowMediator);
  var browserEnumerator = wm.getEnumerator("navigator:browser");

  // Check each browser instance for our URL
  var found = false;
  while (!found && browserEnumerator.hasMoreElements()) {
    var browserWin = browserEnumerator.getNext();
    var tabbrowser = browserWin.gBrowser;

    // Check each tab of this browser instance
    var numTabs = tabbrowser.browsers.length;
    for (var index = 0; index < numTabs; index++) {
      var currentBrowser = tabbrowser.getBrowserAtIndex(index);
      if (url == currentBrowser.currentURI.spec) {

        // The URL is already opened. Select this tab.
        tabbrowser.selectedTab = tabbrowser.tabContainer.childNodes[index];

        // Focus *this* browser-window
        browserWin.focus();

        found = true;
        break;
      }
    }
  }

  // Our URL isn't open. Open it now.
  if (!found) {
    tabs.open({
        url: url,
        isPinned: true,
        inNewWindow: false,
        inBackground: false
    });
  }
}

rat_panel.port.on("click_link", function (text) {
    if (text == "vLog") {
        openAndReuseOneTabPerURL("about:ratslog");
    }
    else if (text == "uLog") {
        man_add_panel.show({
          position: rats_button
        });
        //Reload ratslog page if open?
    }
    else if (text == "rENT") {
        //rats_entry_sidebar.hide();
        //rats_entry_sidebar.url = "./rats_entry_sidebar.html";
        rats_entry_sidebar.show();
        //If already open need to refresh it - how?

    }
    else if (text == "exp") {
        //Save data as csv on desktop
        var dir = sys.pathFor('Desk');
        var path = dir + "\\rats_log.csv";
        
        var db = new PouchDB('RATS'); 
        var options = {include_docs: true};
        var rats_array = [];
        rats_array.push(
            "DB ID",
            "Rats Number",
            "EWS Number",
            "Week Number",
            "Description",
            "Hours"
        );
        
        //Save DB file (TEST)
        //var DBpath = dir + "\\ratsDB_log.txt";
        //var ws = fs.createWriteStream('c:\output.txt');
        //Write_data(DBpath, data);
        //db.dump(ws).then(function (res) {
          // res should be {ok: true}
        //});
        //END TEST
        
        db.allDocs(options, function (err, response) {
            if (response && response.rows.length > 0) {
              //Separate into variables
                for (var i=0;i<response.rows.length;i++) {
                    var rat_data = JSON.stringify(response.rows[i].doc);
                    var rat_data_parsed = JSON.parse(rat_data);
                    var r_id      = rat_data_parsed._id;
                    var r_rats    = rat_data_parsed.rats;
                    var r_ews     = rat_data_parsed.ews;
                    var r_week    = rat_data_parsed.week;
                    var r_desc    = rat_data_parsed.desc;
                    var r_hours   = rat_data_parsed.hours;
                    rats_array.push(
                        "\r\n"+r_id,
                        r_rats,
                        r_ews,
                        r_week,
                        r_desc,
                        r_hours+"\r\n"
                    );
                //console.log(rats_array);
                }
            Write_data(path, rats_array);
            handleHide();
            
            notifications.notify({
                title: "RATS Tracker",
                text: "rats_log.csv saved to: " + dir,
                iconURL: ratIcon
            });
            }
            //console.error(err);
        });
    }
    else {
        //Something is wrong
    } 
    handleHide();
});

function Write_data(name, data){
    var deferred = defer();
    let encoder = new TextEncoder(); // This encoder can be reused for several writes
    let array = encoder.encode(data);
    OS.File.writeAtomic(name, array, {tmpPath: name + ".tmp"});      // Write array atomically to "file.txt", using as temporary buffer "file.txt.tmp".
    return deferred.promise;
}

man_add_panel.port.on("man_add", function (ews, rats, desc, hours) {
    if (ews === "") {
        ews = "N/A";
    }
    
    if (hours === 0) {
        notifications.notify({
            title: "RATS Tracker",
            text: "Invalid hours, must be a number and greater than 0.",
            iconURL: ratIcon
        });
    } else {
        var theDate = new Date();
        //var db = new PouchDB('RATS');
        var doc = {
          "_id": new Date().toJSON(),
          "rats": rats,
          "ews": ews,
          "week": getWeekNumber(theDate),
          "desc": desc, 
          "hours": hours
        };
        db.put(doc);

        handleHide2();
        if (ews == "N/A") {
            notifications.notify({
                title: "RATS Tracker",
                text: "Job " + desc + " [" + hours + " hours] added to RATS log.",
                iconURL: ratIcon
            });
        } else {
            notifications.notify({
                title: "RATS Tracker",
                text: "Job EWS" + ews + " [" + hours + " hours] added to RATS log.",
                iconURL: ratIcon
            });
        }
        updateBadge();
        }
});

pageMod.PageMod({
    include: "about:ratslog",
    contentScriptWhen: 'end',
    contentScriptFile: './js/ratslog.js',
    onAttach: function(worker) {
        worker.port.on("RatsLog:ready", function() {  
            var options = {include_docs: true};

            db.allDocs(options, function (err, response) {

            if (response && response.rows.length > 0) {
              //Separate into variables
                for (var i=0;i<response.rows.length;i++) {
                    var rat_data = JSON.stringify(response.rows[i].doc);
                    var rat_data_parsed = JSON.parse(rat_data);
                    var num = i;
                    var newText_1  = rat_data_parsed._id;
                    var newText_2  = rat_data_parsed.rats;
                    var newText_3  = rat_data_parsed.ews;
                    var newText_4  = rat_data_parsed.week;
                    var newText_5  = rat_data_parsed.desc;
                    var newText_6  = rat_data_parsed.hours;
                    
                    var array = new Array(num, newText_1, newText_2, newText_3, newText_4, newText_5, newText_6);
                    worker.port.emit("addRow", array);
                }
            }
            // handle err or response
            //console.error(err);
          });
        });  
        worker.port.on("RatsLog:updateDesc", function(array) { 
            var descArray = array;
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
        worker.port.on("RatsLog:updateHour", function(array) { 
            var hourArray = array;
            var id = hourArray[0];
            var hour = hourArray[1];
              
            db.get(id).then(function (doc) {
              doc.hours = hour;
              return db.put(doc);
            });
            updateBadge();
        }); 
        worker.port.on("RatsLog:updateRats", function(array) { 
            var ratsArray = array;
            var id = ratsArray[0];
            var rat = ratsArray[1];
              
            db.get(id).then(function (doc) {
              doc.rats = rat;
              return db.put(doc);
            });
        }); 
        worker.port.on("RatsLog:updateEWS", function(array) { 
            var ewsArray = array;
            var id = ewsArray[0];
            var ews = ewsArray[1];
              
            db.get(id).then(function (doc) {
              doc.ews = ews;
              return db.put(doc);
            });
        }); 
        worker.port.on("RatsLog:updateWeek", function(array) { 
            var weekArray = array;
            var id = weekArray[0];
            var week = weekArray[1];
              
            db.get(id).then(function (doc) {
              doc.week = week;
              return db.put(doc);
            });
        });         
    }
});

pageMod.PageMod({
    include: ["http://pafoap01:8888/pls/prod/ece_ewo_web.ece_ewo_page?in_ewr_no=EWS*", "http://pafoap01:8888/pls/prod/ece_ewo_web.ece_ewo_page?in_ewr_id=*"],
    contentScriptWhen: 'end',
    contentScriptFile: './js/rats-ews-ece.js',
    onAttach: function(worker) {
        worker.port.on("defhour", function() {  
            var hour = preferences.defHour;
            worker.port.emit("rtnhour", hour);
        });

        worker.port.on("add", function(EWS, hours) {
            //If EWS remove 'EWS'
            var n = EWS.indexOf("EWS"); 
            if (n > -1){
                EWS = EWS.substr(3, 7);
            }
            var theDate = new Date(); //today

            // Old ID  "_id": "RAT:" + new Date().toJSON(),
            //var db = new PouchDB('RATS');
            var doc = {
              "_id": new Date().toJSON(),
              "rats": "",
              "ews": EWS,
              "week": getWeekNumber(theDate),
              "desc": "", 
              "hours": hours
            };
            db.put(doc);
            
            //Reports what was saved
            //db.get(doc._id).then(function(doc) {
            //    console.error(doc);
            //});
            var hourstxt;
            if (hours > 1) {
                hourstxt = "hours";
            } else {
                hourstxt = "hour";
            }
            notifications.notify({
                title: "RATS Tracker",
                text: EWS + " [" + hours + " " + hourstxt + "] added to RATS log.",
                iconURL: ratIcon
            });
            updateBadge();
        });
        
    }
});

pageMod.PageMod({
    include: "http://pafoap01:8888/pls/prod/ece_web.ece_page?in_ece_no=ECE*",
    contentScriptWhen: 'end',
    contentScriptFile: './js/rats-ews-ece.js',
    onAttach: function(worker) {
        worker.port.on("defhour", function() {  
            var hour = preferences.defHour;
            worker.port.emit("rtnhour", hour);
        });

        worker.port.on("add", function(ECE, hours) {            
            var theDate = new Date(); //today

            var doc = {
              "_id": new Date().toJSON(),
              "rats": "",
              "ews": "",
              "week": getWeekNumber(theDate),
              "desc": ECE, 
              "hours": hours
            };
            db.put(doc);
                           
            var hourstxt;
            if (hours > 1) {
                hourstxt = "hours";
            } else {
                hourstxt = "hour";
            }
            notifications.notify({
                title: "RATS Tracker",
                text: ECE + " [" + hours + " " + hourstxt + "] added to RATS log.",
                iconURL: ratIcon
            });
            updateBadge();
        });
        
    }
});

function registerRemotePage(){
    let RATsLog = new RemotePages("about:ratslog");
}

Cm.QueryInterface(Ci.nsIComponentRegistrar);

// globals
var factory;
const aboutRATSLogDescription = 'About RATS Log';
const aboutRATSLogUUID = '6a3897f0-3ba3-11e5-b970-0800200c9a66'; // make sure you generate a unique id from https://www.famkruithof.net/uuid/uuidgen
const aboutPage_page = Services.io.newChannel('data:text/html,hi this is the page that is shown when navigate to about:myaboutpage', null, null)

function AboutRATS() {}
AboutRATS.prototype = Object.freeze({
    classDescription: aboutRATSLogDescription,
    contractID: '@mozilla.org/network/protocol/about;1?what=ratslog',
    classID: components.ID('{' + aboutRATSLogUUID + '}'),
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
});

function Factory(component) {
    this.createInstance = function(outer, iid) {
        if (outer) {
            throw Cr.NS_ERROR_NO_AGGREGATION;
        }
        return new component();
    };
    this.register = function() {
        Cm.registerFactory(component.prototype.classID, component.prototype.classDescription, component.prototype.contractID, this);
    };
    this.unregister = function() {
        Cm.unregisterFactory(component.prototype.classID, this);
    }
    Object.freeze(this);
    this.register();
}