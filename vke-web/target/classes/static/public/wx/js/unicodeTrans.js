function left_zero_4(str) {
    if (str != null && str != '' && str != 'undefined') {
        if (str.length == 2) {
            return '00' + str;
        }
    }
    return str;
}


//中文汉字转Unicode
function unicode(str){
    var value='';
    for (var i = 0; i < str.length; i++) {
        value += '\\u' + left_zero_4(parseInt(str.charCodeAt(i)).toString(16));
    }
    return value;
}

//Unicode转中文汉字、ASCII转换Unicode
function reconvert(str){
    str = str.replace(/(\\u)(\w{1,4})/gi,
        function($0){
        return (String.fromCharCode(parseInt((escape($0).replace(/(%5Cu)(\w{1,4})/g,"$2")),16)));
    });
    str = str.replace(/(&#x)(\w{1,4});/gi,function($0){
        return String.fromCharCode(parseInt(escape($0).replace(/(%26%23x)(\w{1,4})(%3B)/g,"$2"),16));
    });
    str = str.replace(/(&#)(\d{1,6});/gi,function($0){
        return String.fromCharCode(parseInt(escape($0).replace(/(%26%23)(\d{1,6})(%3B)/g,"$2")));
    });
    return str;
}

//Unicode转换ASCII
function unicode1(str){
    var value='';     for (var i = 0; i < str.length; i++)
    value += '&#' + str.charCodeAt(i) + ';';     return value;
}

//中文转换&#XXXX
function ascii(str){
    var value='';
    for (var i = 0; i < str.length; i++) {
        value += '\&#x' + left_zero_4(parseInt(str.charCodeAt(i)).toString(16))+';';
    }
    return value;
}




