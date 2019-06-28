function genRandomString(length = 5) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

function genRandomPassword(length) {
    if(!length) {
        length = 5;
    }
    var pwd = genRandomString(length);
    $('input[name="password"]').val(pwd);
}
//
// var oTable = $('.datatable').DataTable({
//     "bFilter": false,
//     "aaSorting": [],
// });
// $('#myInputTextField').keyup(function(){
//     oTable.search($(this).val()).draw() ;
// });