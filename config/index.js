let config = {
    mode: 'local',
    port: 3001,
    ws_port: 2083,

    isEmailAuth: true,
    isEnableLog: false,
    isUALog: false,

    mongo: {
        host: '127.0.0.1',
        port: 27017,
        dbname: 'wasfaty_db',
    },

    info: {
        site_url: 'http://127.0.0.1:3001/',
        site_name: "Wasfaty",
        domain: "127.0.0.1",
    },

    node_mail: {
        mail_account: "", //Gmail
        password: ""
    },
    userLevels: ['Salesman', 'Company', 'Pharmacy', 'Client', 'Doctor', 'Driver'], /// CallCenter
    masterItemNames: ['Dosage', 'Brand Name', 'Commercial Group', 'Main Classification', 'Sub Classification',
                      'Product Form', 'Concentration', 'Quantity', 'Unit of measurement', 'Ingredient', 'Company Name',
                      'Age Range', 'Flavor', 'Color'],
    masterItemURLs: ['dosage', 'brand', 'commercial-group', 'main-classification', 'sub-classification',
                    'product-form', 'concentration', 'quantity', 'unit-of-measurement', 'ingredient', 'company-name',
                    'age-range', 'flavor', 'color'],
    masterItemKeys: {
        mainClassId: {type:'main-classification', name:'Main Classification'},
        subClassId: {type:'sub-classification', name:'Sub Classification'},
        brandId: {type:'brand', name:'Brand Name'},
        pdtFormId: {type:'product-form', name:'Product Form'},
        cctId: {type:'concentration', name:'Concentration'},
        dosageId: {type:'dosage', name:'Dosage'},
        qtyId: {type:'quantity', name:'Quantity'},
        unitMsId: {type:'unit-of-measurement', name:'Unit of measurement'},
        ingId: {type:'ingredient', name:'Ingredient'},
        flavorId: {type:'flavor', name:'Flavor'},
        // cpyNameId: {type:'company-name', name:'Company Name'},
        ageRangeId: {type:'age-range', name:'Age Range'},
        colorId: {type:'color', name:'Color'}
    },
    pwd_length: 1,
    orderStatus: ['Open', 'Pending', 'Closed', 'Cancelled', 'Under process'],
    orderItemStatus: ['Delivered', 'Not Delivered'],
    defaultPassword: '123',
    gMapKey: 'AIzaSyCuzSBVqvIjrk1KEw-To6D3-TiMqPN1cWg',
    mapCenter: {lat: 21.4858, long: 39.1915}, //Saudi Arabia Jeddah,
    tz: 8 * 60 * 60 * 1000,
    // poTs: 3 * 60 * 1000 // 3 mins , checking time to pending delivery orders
    poTs: 5 * 1000, // 3 mins , checking time to pending delivery orders,
    defaultCommissions: {
        Salesman: 20,
        Doctor: 30,
        Pharmacy: 10,
        Company: 25,
    },
    wasfatyCommission: 60
};

module.exports = config;
