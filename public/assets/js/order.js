

$('.my-datatable tbody').on('click', 'tr', function () {
    var trList = $('.my-datatable tbody tr');
    trList.each(function () {
        $(this).removeClass('selected');
    });
    $(this).addClass('selected');
});

$('.my-datatable-item tbody').on('click', 'tr', function () {
    var trList = $('.my-datatable-item tbody tr');
    trList.each(function () {
        $(this).removeClass('selected');
    });
    $(this).addClass('selected');
});


$('#chooseClient').on('show.bs.modal', function (event) {
    console.log('show select client modal');
});
$('#chooseClient').on('hide.bs.modal', function (event) {
    console.log('hide select client modal');
    $('.my-datatable tbody tr').removeClass('selected');
});

$('#addItemModal').on('show.bs.modal', function (event) {
    console.log('show add item modal');
});

$('#addItemModal').on('hide.bs.modal', function (event) {
    console.log('hide add item modal');
    $('.my-datatable-item tbody tr').removeClass('selected');
});

function onChangeUserMode(mode) {
    if (mode == 'new') {
        $('#ws-new-user').removeClass('btn-outline-primary');
        $('#ws-new-user').addClass('btn-primary');

        $('#ws-existing-user').addClass('btn-outline-primary');
        $('#ws-existing-user').removeClass('btn-primary');

        $('.ws-order-ctl').attr('disabled', false);

        $('input[name="clientEmail"]').val('');
        $('input[name="clientPhone"]').val('');
        $('input[name="clientName"]').val('');

    } else {
        $('#ws-existing-user').removeClass('btn-outline-primary');
        $('#ws-existing-user').addClass('btn-primary');

        $('#ws-new-user').addClass('btn-outline-primary');
        $('#ws-new-user').removeClass('btn-primary');
    }
}

function onSelectClient(self) {
    if (table.rows('.selected').data().length > 0) {
        var useInfo = ($('.my-datatable tbody tr.selected').data());

        $('input[name="clientEmail"]').val(useInfo.email);
        $('input[name="clientPhone"]').val(useInfo.phone);
        $('input[name="clientName"]').val(useInfo.name);

        $('#insuranceType').val(useInfo.type);
        $('#insuranceGrade').val(useInfo.grade);
        $('#insuranceCompany').val(useInfo.company);

        $('.ws-order-ctl').attr('disabled', true);
    }
    $('#chooseClient').modal('hide');
}

function onAddFavItem() {

    var selItem = $('.add-cart-btn.active');
    if (selItem.length > 0) {
        var itemInfo = {
            pic: selItem.data('pic'),
            code: selItem.data('code'),
            description: selItem.data('description'),
            price: selItem.data('price'),
            name: selItem.data('name')
        };
        var itemCode = itemInfo.code;
        $.ajax('/product/add/fav-product', {
           type:'post',
           data:{itemId: itemCode},
           success: function (res) {
               if (res.status == 'success') {
                   alert(globalMsg['Added in favorite list successfully!']);
               } else {
                   alert(globalMsg[res.data]);
               }
           }
        });

    } else {
        alert(globalMsg['Please specify item record!']);
    }
}


function onAddItem(self) {
    var selItem = $('.add-cart-btn.active');

    if (selItem.length > 0) {
        var itemInfo = {
            pic: selItem.data('pic'),
            code: selItem.data('code'),
            description: selItem.data('description'),
            price: selItem.data('price'),
            name: selItem.data('name')
        };

        var dosage = $('#add-item-dosage').val();
        var count = $('#add-item-qty').val();
        // Make Html
        var itemHTML = `<tr id="${itemInfo.code}">
                            <td style="width: 82px">
                                <img class="itemPic" src="${(itemInfo.pic) ? itemInfo.pic : "/assets/img/no_image.png"}">
                            </td>
                            <td>${itemInfo.code}</td>
                            <td>${itemInfo.description}</td>
                            <td>${dosage}</td>
                            <td>${count}</td>
                            <td>${itemInfo.price}</td>
                            <td>${itemInfo.price * count}</td>
                            <td>Not Delivered</td>
                            <td>
                                <button class="btn btn-danger" type="button" onclick="onDeleteItem('${itemInfo.code}')">
                                    <i class="fa fa-close"></i>
                                </button>
                            </td>
                        </tr>`;
        $('#order-items-body').append(itemHTML);
        // update total number
        calculateTotalPrice();
        $('#addItemModal').modal('hide');
    } else {
        alert(globalMsg['Please specify item record!']);
    }

}


function onDeleteItem(itemCode) {
    $('#' + itemCode).remove();
    calculateTotalPrice();
}

function calculateTotalPrice() {

    var trList = $('#order-items-body tr');
    var totalPrice = 0.00;
    trList.each(function () {
        var tdItems = $(this).find('td');
        totalPrice += Number($(tdItems[6]).text());
    });

    $('#total-item-price').text(totalPrice);
}

$('#order-save-btn').click(function (e) {

    swal({
        title: globalMsg['Are you sure to create this order?'],
        icon: "warning",
        buttons: true,
        dangerMode: true,
    })
        .then((willDelete) => {
            if (willDelete) {
                getItemTableStatus();
            } else {
                console.log('close modal');
            }
        });
    //Check Validation
});

$('#order-update-btn').click(function (e) {
    getItemTableStatusUpdate();
    //Check Validation
});


function getItemTableStatus() {
    var trList = $('#order-items-body tr');
    var itemList = [];
    var totalPrice = 0.000;
    trList.each(function () {
        var tdItems = $(this).find('td');
        totalPrice += Number($(tdItems[6]).text());
        var itemCode = $(tdItems[1]).text();
        var itemDescription = $(tdItems[2]).text();
        var itemDosage = $(tdItems[3]).text();
        var itemQty = Number($(tdItems[4]).text());
        var itemAmount = Number($(tdItems[5]).text());
        var itemTotal = Number($(tdItems[6]).text());
        var itemStatus = $(tdItems[7]).text();
        itemList.push({
            code: itemCode,
            description: itemDescription,
            dosage: itemDosage,
            qty: itemQty,
            amount: itemAmount,
            total: itemTotal,
            status: itemStatus
        });
    });

    console.log(itemList);
    console.log(totalPrice);

    var clientEmail = $('input[name="clientEmail"]').val();
    if (!clientEmail || !isEmail(clientEmail)) {
        $('input[name="clientEmail"]').addClass('border-danger');
        return;
    } else {
        $('input[name="clientEmail"]').removeClass('border-danger');
    }
    var clientPhone = $('input[name="clientPhone"]').val();
    if (!clientPhone || !isPhoneNumber(clientPhone)) {
        $('input[name="clientPhone"]').addClass('border-danger');
        return;
    } else {
        $('input[name="clientPhone"]').removeClass('border-danger');
    }

    var clientName = $('input[name="clientName"]').val();
    if (!clientName) {
        $('input[name="clientName"]').addClass('border-danger');
        return;
    } else {
        $('input[name="clientName"]').removeClass('border-danger');
    }

    if (totalPrice > 0) {
        //Check Validation
        $.ajax('/orders/create', {
            type: 'post',
            dataType: 'json',
            data: {
                orderId: $('input[name="orderId"]').val(),
                clientEmail: clientEmail, //client email,
                clientPhone: clientPhone,
                clientName: clientName,
                insuranceGrade: $('#insuranceGrade').val(),
                insuranceCompany: $('#insuranceCompany').val(),
                insuranceType: $('#insuranceType').val(),
                remark: $('input[name="remark"]').val(),
                items: itemList,
                totalPrice: Number(totalPrice)
            },
            beforeSend: function (xhr) {

            },
            success: function (res) {
                if (res.status == 'success') {
                    alert(res.data);
                    location.href = "/orders"
                } else {
                    alert(res.data);
                }
            },
            error: function (err) {

            },
            complete: function (res) {
                console.log('done');
            }
        })
    }
}

function getItemTableStatusUpdate() {
    var trList = $('#order-items-body tr');
    var itemList = [];
    var totalPrice = 0.000;
    trList.each(function () {
        var tdItems = $(this).find('td');
        totalPrice += Number($(tdItems[6]).text());
        var itemCode = $(tdItems[1]).text();
        var itemDescription = $(tdItems[2]).text();
        var itemDosage = $(tdItems[3]).text();
        var itemQty = Number($(tdItems[4]).text());
        var itemAmount = Number($(tdItems[5]).text());
        var itemTotal = Number($(tdItems[6]).text());
        var itemStatus = $(tdItems[7]).text();
        itemList.push({
            code: itemCode,
            description: itemDescription,
            dosage: itemDosage,
            qty: itemQty,
            amount: itemAmount,
            total: itemTotal,
            status: itemStatus
        });
    });

    console.log(itemList);
    console.log(totalPrice);

    var clientEmail = $('input[name="clientEmail"]').val();
    if (!clientEmail || !isEmail(clientEmail)) {
        $('input[name="clientEmail"]').addClass('border-danger');
        return;
    } else {
        $('input[name="clientEmail"]').removeClass('border-danger');
    }
    var clientPhone = $('input[name="clientPhone"]').val();
    if (!clientPhone || !isPhoneNumber(clientPhone)) {
        $('input[name="clientPhone"]').addClass('border-danger');
        return;
    } else {
        $('input[name="clientPhone"]').removeClass('border-danger');
    }

    var clientName = $('input[name="clientName"]').val();
    if (!clientName) {
        $('input[name="clientName"]').addClass('border-danger');
        return;
    } else {
        $('input[name="clientName"]').removeClass('border-danger');
    }

    var orderId = $('input[name="orderId"]').val();

    if (totalPrice > 0) {
        //Check Validation
        $.ajax('/orders/update/' + orderId, {
            type: 'post',
            dataType: 'json',
            data: {
                orderId: orderId,
                clientEmail: clientEmail, //client email,
                clientPhone: clientPhone,
                clientName: clientName,
                insuranceGrade: $('#insuranceGrade').val(),
                insuranceCompany: $('#insuranceCompany').val(),
                insuranceType: $('#insuranceType').val(),
                remark: $('input[name="remark"]').val(),
                items: itemList,
                totalPrice: Number(totalPrice)
            },
            beforeSend: function (xhr) {

            },
            success: function (res) {
                if (res.status == 'success') {
                    alert(res.data);
                    location.href = "/orders"
                } else {
                    alert(res.data);
                }
            },
            error: function (err) {

            },
            complete: function (res) {
                console.log('done');
            }
        })
    }
}
