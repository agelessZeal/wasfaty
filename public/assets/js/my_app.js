setTimeout(function () {
    hideNotifications();
}, 2500);
var hideNotifications = function () {
    $('.alert').each(function () {
        if($(this).attr('class').indexOf('alert-dismissible')<0) {
            $(this).slideUp(600, function () {
                $(this).remove();
            })
        }
    })
};

$('.ws-delete-link').click(function () {
    $('#delete_box h3').text('Are you sure want to delete this ' + $(this).data('msg') + '?');
    $('#delete_box a.btn-danger').attr('href', $(this).data('url'));
});

function showPosition(position) {
    $('input[name="gpsLat"]').val(position.coords.latitude);
    $('input[name="gpsLong"]').val(position.coords.longitude);

    if (typeof marker != "undefined" && marker) {
        marker.setPosition({lat:position.coords.latitude, lng:position.coords.longitude});
    }

    if (typeof map != "undefined" && map) {
        map.setCenter({
            lat : position.coords.latitude,
            lng : position.coords.longitude
        });
    }
}

function getMyLocation() {
    // Server Side Mode to get GPS Location
    $.ajax('/api/location', {
        type:'get',
        data:{},
    }).done(function (res) {
        showPosition({coords: {latitude: res.gpsLat, longitude: res.gpsLong}});
    }).fail(function (jqxhr, textStatus) {

    }).always(function (res) {
        console.log('done');
    })
}
getMyLocation();

function onPrintOrderDetails() {
    //Get Order Details
    var orderId = $('input[name="orderId"]').val();
    var clientEmail = $('input[name="clientEmail"]').val();
    var clientMobile = $('input[name="clientPhone"]').val();
    var clientName = $('input[name="clientName"]').val();
    var insuranceType = $('#curInsType').val();
    var insuranceGrade = $('#curInsGrade').val();
    var insuranceCompany = $('#curInsCompany').val();
    var orderRemark  = $('input[name="remark"]').val();
    var totalPrice = $('#total-item-price').text();

    var itemDetails = [];
    var itemInfoTags = $('#order-items-body tr');
    itemInfoTags.each(function (item, index) {
        var singleItemInfo = $(this).find('td');
        var itemImg = $(singleItemInfo[0]).find('img').attr('src');
        var itemCode = $(singleItemInfo[1]).text().trim();
        var itemDescription = $(singleItemInfo[2]).text().trim();
        var itemDosage = $(singleItemInfo[3]).text().trim();
        var itemQty = $(singleItemInfo[4]).text().trim();
        var itemAmount = $(singleItemInfo[5]).text().trim();
        var itemTotal = $(singleItemInfo[6]).text().trim();
        var itemStatus = $(singleItemInfo[7]).text().trim();

        itemDetails.push({
            itemImg: itemImg,
            itemCode: itemCode,
            itemDescription: itemDescription,
            itemDosage: itemDosage,
            itemQty: itemQty,
            itemAmount: itemAmount,
            itemTotal: itemTotal,
            itemStatus: itemStatus,
        })
    });

    $.ajax('/orders/view/print', {
        type:'post',
        data: {
            orderId: orderId,
            clientEmail: clientEmail,
            clientMobile: clientMobile,
            clientName: clientName,
            insuranceType: insuranceType,
            insuranceGrade: insuranceGrade,
            insuranceCompany: insuranceCompany,
            orderRemark: orderRemark,
            totalPrice: totalPrice,
            items: itemDetails
        }
    }).done(function (res) {
        if (res.status == 'success') {
            var anchor = document.createElement('a');
            anchor.href = '/' + res.data.fp;
            anchor.target = '_blank';
            anchor.download = res.data.name;
            anchor.click();
            anchor.remove();
        } else {
            alert(res.data);
        }
    }).fail(function (res) {
        alert("Unknown Error");
    }).always(function (res) {

    })
}

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
