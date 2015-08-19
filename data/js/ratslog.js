var TgTableSort = window.TgTableSort || function(n, t) {
    "use strict";

    function r(n, t) {
        for (var e = [], o = n.childNodes, i = 0; i < o.length; ++i) {
            var u = o[i];
            if ("." == t.substring(0, 1)) {
                var a = t.substring(1);
                f(u, a) && e.push(u)
            } else u.nodeName.toLowerCase() == t && e.push(u);
            var c = r(u, t);
            e = e.concat(c)
        }
        return e
    }

    function e(n, t) {
        var e = [],
            o = r(n, "tr");
        return o.forEach(function(n) {
            var o = r(n, "td");
            t >= 0 && t < o.length && e.push(o[t])
        }), e
    }

    function o(n) {
        return n.textContent || n.innerText || ""
    }

    function i(n) {
        return n.innerHTML || ""
    }

    function u(n, t) {
        var r = e(n, t);
        return r.map(o)
    }

    function a(n, t) {
        var r = e(n, t);
        return r.map(i)
    }

    function c(n) {
        var t = n.className || "";
        return t.match(/\S+/g) || []
    }

    function f(n, t) {
        return -1 != c(n).indexOf(t)
    }

    function s(n, t) {
        f(n, t) || (n.className += " " + t)
    }

    function d(n, t) {
        if (f(n, t)) {
            var r = c(n),
                e = r.indexOf(t);
            r.splice(e, 1), n.className = r.join(" ")
        }
    }

    function v(n) {
        d(n, L), d(n, E)
    }

    function l(n, t, e) {
        r(n, "." + E).map(v), r(n, "." + L).map(v), e == T ? s(t, E) : s(t, L)
    }

    function g(n) {
        return function(t, r) {
            var e = n * t.str.localeCompare(r.str);
            return 0 == e && (e = t.index - r.index), e
        }
    }

    function h(n) {
        return function(t, r) {
            var e = +t.str,
                o = +r.str;
            return e == o ? t.index - r.index : n * (e - o)
        }
    }

    function m(n, t, r) {
        var e = u(n, t),
            o = e.map(function(n, t) {
                return {
                    str: n,
                    index: t
                }
            }),
            i = e && -1 == e.map(isNaN).indexOf(!0),
            a = i ? h(r) : g(r);
        return o.sort(a), o.map(function(n) {
            return n.index
        })
    }

    function p(n, t, r, o) {
        for (var i = f(o, E) ? N : T, u = m(n, r, i), c = 0; t > c; ++c) {
            var s = e(n, c),
                d = a(n, c);
            s.forEach(function(n, t) {
                n.innerHTML = d[u[t]]
            })
        }
        l(n, o, i)
    }

    function x(n, t) {
        var r = t.length;
        t.forEach(function(t, e) {
            t.addEventListener("click", function() {
                p(n, r, e, t)
            }), s(t, "tg-sort-header")
        })
    }
    var T = 1,
        N = -1,
        E = "tg-sort-asc",
        L = "tg-sort-desc";
    return function(t) {
        var e = n.getElementById(t),
            o = r(e, "tr"),
            i = o.length > 0 ? r(o[0], "td") : [];
        0 == i.length && (i = r(o[0], "th"));
        for (var u = 1; u < o.length; ++u) {
            var a = r(o[u], "td");
            if (a.length != i.length) return
        }
        x(e, i)
    }
}(document);
document.addEventListener("DOMContentLoaded", function(n) {
    TgTableSort("rats-log")
});

function closeInput(elm) {
    var td = elm.parentNode;
    var value = elm.value;
    td.removeChild(elm);
    td.innerHTML = value;
    //Save data to DB
    if (td.id == "D") {
        var id = td.parentNode.id;
        var updateArray = new Array(id, value);
        sendAsyncMessage("updateDesc", updateArray);
    } else if (td.id == "H") {
        var id = td.parentNode.id;
        var updateArray = new Array(id, value);
        sendAsyncMessage("updateHour", updateArray);
    } else if (td.id == "R") {
        var id = td.parentNode.id;
        var updateArray = new Array(id, value);
        sendAsyncMessage("updateRats", updateArray);
    } else if (td.id == "J") {
        var id = td.parentNode.id;
        var updateArray = new Array(id, value);
        sendAsyncMessage("updateJob", updateArray);
    } else if (td.id == "W") {
        var id = td.parentNode.id;
        var updateArray = new Array(id, value);
        sendAsyncMessage("updateWeek", updateArray);
    }
    
}

function addInput(elm) {
    if (elm.getElementsByTagName('input').length > 0) return;

    var value = elm.innerHTML;
    elm.innerHTML = '';

    var input = document.createElement('input');
    input.setAttribute('type', 'text');
    input.setAttribute('class', 'update');
    input.setAttribute('value', value);
    input.setAttribute('onBlur', 'closeInput(this)');
    elm.appendChild(input);
    input.focus();
}

sendAsyncMessage("ready");
addMessageListener("addRow", function(result) {

    var stringArray = result.data;
    var row = stringArray[0];
    var id = stringArray[1];
    var rats = stringArray[2];
    var job = stringArray[3];
    var week = stringArray[4];
    var desc = stringArray[5];
    var hours = stringArray[6];
    var table = document.getElementById('rats-log');
    
    function isEven(n) 
    {
       return n % 2 == 0;
    }
    function isOdd(n)
    {
       return Math.abs(n) % 2 == 1;
    }
    var theDate = new Date(id);
    if (isEven(Number(week))) {
        var a = Number(week)+100;
        var b = Number(week)+100;
        var c = theDate.getMonth()*.05;
    }
    if (isOdd(Number(week))) {
        var a = Number(week)+200;
        var b = Number(week)+200;
        var c = theDate.getMonth()*.1;
    }
        
    var newRow   = table.insertRow(row+1);
    //newRow.setAttribute("class", "tg-ugh9");
    newRow.setAttribute("style", "background-color:rgba(" + a + ",150," + b + "," + c + ");");
    newRow.setAttribute("id", id);
    var newCell_1  = newRow.insertCell(0);
    var newText_1  = document.createTextNode(id);
    newCell_1.appendChild(newText_1);
    
    var newCell_2  = newRow.insertCell(1);
    newCell_2.setAttribute("id", "R");
    newCell_2.setAttribute("ondblclick", "addInput(this);");
    var newText_2  = document.createTextNode(rats);
    newCell_2.appendChild(newText_2);
    
    var newCell_3  = newRow.insertCell(2);
    newCell_3.setAttribute("id", "J");
    newCell_3.setAttribute("ondblclick", "addInput(this);");
    var newText_3  = document.createTextNode(job);
    newCell_3.appendChild(newText_3);
    
    var newCell_4  = newRow.insertCell(3);
    newCell_4.setAttribute("id", "W");
    newCell_4.setAttribute("ondblclick", "addInput(this);");
    var newText_4  = document.createTextNode(week);
    newCell_4.appendChild(newText_4);
    
    var newCell_5  = newRow.insertCell(4);
    newCell_5.setAttribute("id", "D");
    newCell_5.setAttribute("ondblclick", "addInput(this);");
    var newText_5  = document.createTextNode(desc);
    newCell_5.appendChild(newText_5);
    
    var newCell_6  = newRow.insertCell(5);
    newCell_6.setAttribute("id", "H");
    newCell_6.setAttribute("ondblclick", "addInput(this);");
    var newText_6  = document.createTextNode(hours);
    newCell_6.appendChild(newText_6);
    
});