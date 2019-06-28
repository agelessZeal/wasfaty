let config = {
    mode: 'local',
    port: 3000,
    ws_port: 2083,

    isEmailAuth: false,
    isEnableLog: false,
    isUALog: false,

    mongo: {
        host: '127.0.0.1',
        port: 27017,
        dbname: 'wasfaty_db',
    },

    info: {
        site_url: 'http://127.0.0.1:3000/',
        site_name: "Wasfaty",
        domain: "127.0.0.1",
    },

    node_mail: {
        mail_account: "", //Gmail
        password: ""
    },
    userLevels: ['Salesman', 'Company', 'Pharmacy', 'Client', 'Doctor', 'Driver'],
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
        cpyNameId: {type:'company-name', name:'Company Name'},
        ageRangeId: {type:'age-range', name:'Age Range'},
        colorId: {type:'color', name:'Color'}
    },
    pwd_length: 1,
    orderStatus: ['Open', 'Pending', 'Closed', 'Cancelled', 'Under process'],
    defaultPassword: '123',
};

module.exports = config;
