var self = require('sdk/self');
var notifications = require("sdk/notifications");
var { indexedDB, IDBKeyRange } = require('sdk/indexed-db');
const { ToggleButton } = require("sdk/ui/button/toggle");
const pageMod = require("sdk/page-mod");
const tabs = require("sdk/tabs");
const panels = require("sdk/panel");
const {Cc,Ci,Cm,Cu,components} = require("chrome");
Cu.import("resource://gre/modules/XPCOMUtils.jsm", this);
Cu.import("resource://gre/modules/RemotePageManager.jsm");
Cu.import("resource://gre/modules/Services.jsm", this);

var PouchDB = require('./lib/pouchdb-4.0.0.js');



var myIconURL = self.data.url("./icon-32.png");

var rats_button = ToggleButton({
  id: "rats-log",
  label: "RATS",
  badge: "",
  badgeColor: "#00AAAA",
  icon: {
    "16": "./icon-16.png",
    "32": "./icon-32.png",
    "64": "./icon-64.png"
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

function handleHide() {
  rats_button.state('window', {checked: false});
  rat_panel.hide();
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
        //pop-up to manual add entry
        //Reload ratslog page if open
    }
    else if (text == "rENT") {
        //Monitor clipboard for paste action inside loop
    }
    else if (text == "exp") {
        //Save data to some format on desktop
    }
    else {
        //Something is wrong
    } 
    handleHide();
});


pageMod.PageMod({
    include: "http://pafoap01:8888/pls/prod/ece_ewo_web.ece_ewo_page?in_ewr_no=EWS*",
    contentScriptWhen: 'end',
    contentScriptFile: './js/rats-ews.js',
    onAttach: function(worker) {
        worker.port.on("add", function(EWS, hours) {            
            var theDate = new Date(); //today
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
            // Old ID  "_id": "RAT:" + new Date().toJSON(),
            var db = new PouchDB('RATS');
            var doc = {
              "_id": new Date().toJSON(),
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
                iconURL: myIconURL
            });
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
            var newText_2  = rat_data_parsed.job;
            var newText_3  = rat_data_parsed.week;
            var newText_4  = rat_data_parsed.desc;
            var newText_5  = rat_data_parsed.hours;
            
            var array = new Array(num, newText_1, newText_2, newText_3, newText_4, newText_5);
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