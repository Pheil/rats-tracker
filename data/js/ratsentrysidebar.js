//window.onload = function () {
    var selected,
        selectCell = function (e) {
            var cell = e.target,
                range, selection;
            if (cell.tagName.toLowerCase() !== 'td') {
                while (cell = cell.parentElement) {
                    if (cell.tagName.toLowerCase() === 'td') {
                        break;
                    }               
                }
            }
            if (!cell || cell.tagName.toLowerCase() !== 'td') {
                return;
            }
            if (selected) {
                selected.style.backgroundColor = '';            
            }
            cell.style.backgroundColor = '#ff0';
            selected = cell;
        },
        afterCopyCell = function (e) {
            if (!selected || !e.ctrlKey || e.which !== 67) {
                return;
            }
            selection = window.getSelection();
            selection.removeAllRanges();
        },
    table = document.getElementById('rats-log');
    table.addEventListener('click', selectCell);
    document.body.addEventListener('keyup', afterCopyCell);
//};


function logText() {
  // 'this' is automatically passed to the named
  // function via the use of addEventListener()
  // (later):
  addon.port.emit("copy", this.textContent);
}

// using a CSS Selector, with document.querySelectorAll()
// to get a NodeList of <td> elements within the #tableID element:
var cells = document.querySelectorAll('#rats-log td');

// iterating over the array-like NodeList, using
// Array.prototype.forEach() and Function.prototype.call():
Array.prototype.forEach.call(cells, function(td) {
  // the first argument of the anonymous function (here: 'td')
  // is the element of the array over which we're iterating.

  // adding an event-handler (the function logText) to handle
  // the click events on the <td> elements:
  td.addEventListener('click', logText);
});  

    $(function() {
    $( "#from" ).datepicker({
      defaultDate: "-4w",
      dateFormat: "yy-mm-dd",
      showWeek: true,
      changeMonth: true,
      numberOfMonths: 1,
      onClose: function( selectedDate ) {
        $( "#to" ).datepicker( "option", "minDate", selectedDate );
      }
    });
    $("#from").datepicker("setDate", "-4w");

    $( "#to" ).datepicker({
      defaultDate: "+0w",
      dateFormat: "yy-mm-dd",
      showWeek: true,
      changeMonth: true,
      numberOfMonths: 1,
      onClose: function( selectedDate ) {
        $( "#from" ).datepicker( "option", "maxDate", selectedDate );
      }
    });
    $("#to").datepicker("setDate", "+0");
  });

//Sidebar loaded so retrieve and display baseline data
//var fromDate = $( "#from" ).datepicker( "getDate" );

addon.port.emit("loaded");

addon.port.on("update", function(array) {
    //var fromDate = $("#from").val(); //Formatted date
    //var fromDate = $( "#from" ).datepicker( "getDate" ); //full date
    //var toDate = $( "#to" ).datepicker( "getDate" );
    //console.log(fromDate + "sidebar script got the reply" + toDate);
    
    //Add data from array to table
    var stringArray = array;
    var row = stringArray[0];
    var rats = stringArray[1];
    var ews = stringArray[2];
    var week = stringArray[3];
    var desc = stringArray[4];
    var hours = stringArray[5];
    var table = document.getElementById('rats-log');
        
    var newRow   = table.insertRow(row+1);
    var newCell_1  = newRow.insertCell(0);
    var newText_1  = document.createTextNode(rats);
    newCell_1.appendChild(newText_1);
    
    var newCell_2  = newRow.insertCell(1);
    var newText_2  = document.createTextNode(ews);
    newCell_2.appendChild(newText_2);
    
    var newCell_3  = newRow.insertCell(2);
    var newText_3  = document.createTextNode(week);
    newCell_3.appendChild(newText_3);
    
    var newCell_4  = newRow.insertCell(3);
    var newText_4  = document.createTextNode(desc);
    newCell_4.appendChild(newText_4);
    
    var newCell_5  = newRow.insertCell(4);
    var newText_5  = document.createTextNode(hours);
    newCell_5.appendChild(newText_5);    
});

  