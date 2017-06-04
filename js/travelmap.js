    var markerList = [];
    var map;
    var countryCenterLookupDict = {};
    var visitedCountriesList = [];

    var RED_PIN_FLASHING = 'images/pin_red.gif';
    var RED_PIN          = 'images/pin_red.png';
    var BLUE_PIN         = 'images/pin_blue.png';

    function Country(id, short_name, long_name, latitude, longitude) {
        this.id         = id;
        this.short_name = short_name;
        this.long_name  = long_name;
        this.latitude   = latitude;
        this.longitude  = longitude;
        this.is_visited = false;
        this.year_visited   = "";
        this.duration       = "";
        this.cities_visited = [];
        this.is_home        = false;
    }

    function initMap() {
        var myoverlay = new google.maps.OverlayView();       

        initializeMap("Subtle Grayscale");

        getCountryCentoidsFromJSON();

        getVisitedCountriesFromJSON();

        addVisitedCountryMarkers();

        myoverlay.draw = function() {
            this.getPanes().markerLayer.id = 'markerLayer';
        };
        myoverlay.setMap(map);
    }

    function initializeMap(styleName){
        map = new google.maps.Map(document.getElementById('map'), {
            zoom: 2,
            center: {
                lat: 29.3341418,
                lng: 10.0562153
            },
            options: {
                minZoom: 2,
                maxZoom: 10,
                draggable: false
            }               
        });

        if(styleName){
            map.set('styles', JSON.parse(getStyleFromJson(styleName)));
        }
    }

    function addVisitedCountryMarkers(){
        for(var i=0; i<visitedCountriesList.length; i++){  
            addMarkerForCountry(visitedCountriesList[i]);
        }
    }

    function addMarkerForCountry(country){
        if(countryCenterLookupDict[country] == null){
            console.log("Country \""+ country.short_name +"\" not Found!");
            return;
        }

        //Pulled from map as Strings, must cast to Float
        var lat = parseFloat(countryCenterLookupDict[country].latitude);
        var lng = parseFloat(countryCenterLookupDict[country].longitude);
        var is_home = countryCenterLookupDict[country].is_home;
        var name = countryCenterLookupDict[country].short_name;

        addMarker(name, lat, lng, is_home);            
    }

    function getJsonObject(filePath){
        var jsonData = getJSON(filePath);
        jsonObj = JSON.parse(jsonData);
    }

    function getStyleFromJson(styleName){
        var jsonData = getJSON('json/mapstyles.json');
        jsonObj = JSON.parse(jsonData);

        for(var i=0; i<jsonObj.length; i++){
            if(jsonObj[i].name === styleName){
                return jsonObj[i].style;
            }            
        }


        console.log("Style \""+ styleName +"\" not Found!");
    }

    function getCountryCentoidsFromJSON(){
        var jsonData = getJSON('json/countrycenters.json');
        jsonObj = JSON.parse(jsonData);

        for(var i=0; i<jsonObj.length; i++){                 
            var tmpCountry = new Country(jsonObj[i].id, jsonObj[i].short_name, 
                                         jsonObj[i].long_name, jsonObj[i].latitude,
                                         jsonObj[i].longitude);   

            countryCenterLookupDict[tmpCountry.short_name] = tmpCountry;              
        }
    }

    function getVisitedCountriesFromJSON(){
        var jsonData = getJSON('json/visitedcountries.json');
        jsonObj = JSON.parse(jsonData);

        for(var i=0; i<jsonObj.length; i++){
            var tmpCountry = countryCenterLookupDict[jsonObj[i].country_name];
            tmpCountry.is_visited     = true;
            tmpCountry.year_visited   =  jsonObj[i].year_visited;
            tmpCountry.duration       =  jsonObj[i].duration;
            tmpCountry.cities_visited =  jsonObj[i].cities_visited;
            tmpCountry.is_home        =  jsonObj[i].is_home;               

            visitedCountriesList.push(tmpCountry.short_name);            
        }
    }

    function getJSON(url) {
        var resp, xmlHttp;

        resp = '';
        xmlHttp = new XMLHttpRequest();

        if(xmlHttp != null){
            xmlHttp.open("GET", url, false);
            xmlHttp.send(null);
            resp = xmlHttp.responseText;
        }

        return resp;
    }

    var hoverwindow = null;
    var clickwindow = null;
    function addMarker(name, lat, lng, is_home) {
        var marker = new google.maps.Marker({
            position: {
                lat: lat,
                lng: lng
            },
            map: map,
            // set the icon as markerIcon declared above
            icon: {
                url: is_home ? BLUE_PIN : RED_PIN,
                size: new google.maps.Size(12, 12), //marker image size
                origin: new google.maps.Point(0, 0), // marker origin
                anchor: new google.maps.Point(12, 12) // X-axis value (35, half of marker width) and 86 is Y-axis value (height of the marker).
            },
            // must use optimized false for CSS
            optimized: false,
            name: name
        });

        marker.addListener('mouseover', 
                            function() {
                                infowindow = getInfoWindow(this);

                                infowindow.open(map, this);
                            },
                            {passive: true});

        // assuming you also want to hide the infowindow when user mouses-out
        marker.addListener('mouseout', 
                            function() {infowindow.close();},
                            {passive: true});

        marker.addListener('click',
                            function() {
                                if(clickwindow){
                                    clickwindow.close();
                                }                

                                clickwindow = getInfoWindow(marker);

                                clickwindow.open(map, this);
                            },
                            {passive: true});

        markerList.push(marker);
    }

    function getInfoWindow(marker){
        var country = countryCenterLookupDict[marker.name];
        var infoString = '<p style="text-align:center;">' + country.long_name + '</p>' +
        '<p> Visited in ' + country.year_visited + '!</p>' +
        '<p> Cities Explored: ' + country.cities_visited + '</p>' +
        '<p style="text-align:center;"><img src="images/test-beacon.gif" style="width:64px;height:64px;align="center"></p>';

        return new google.maps.InfoWindow({
                     content: infoString,
                     map: map
                   });
    }