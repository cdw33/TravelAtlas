    var markerList = [];
    var map;
    var countryCenterLookupDict = {};
    var visitedCountriesList = [];

    var RED_PIN          = 'pin_red.png';
    var BLUE_PIN         = 'pin_blue.png';

    const IMAGE_PATH             = 'images/'
    const CONFIG_FILE            = "json/config.json";
    const MAP_STYLES_FILE        = "json/mapstyles.json";
    const COUNTRY_CENTOIDS_FILE  = "json/countrycenters.json";
    const VISITED_COUNTRIES_FILE = "json/visitedcountries.json";

    var northEastBounds, southWestBounds;

    var LocationType = {
        "home":1, 
        "country":2, 
        "city":3
    }

    //Settings
    var isStyleEnabled, styleName, centerLatitude, centerLongitude, defaultZoom, homeIcon, cityIcon, countryIcon, isInfoDialogEnabled, isCountryMarkersEnabled, isCityMarkersEnabled;

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

        initializeSettings();  

        initializeMap();

        getCountryCentoidsFromJSON();

        getVisitedCountriesFromJSON();

        addVisitedMarkers();

        myoverlay.draw = function() {
            this.getPanes().markerLayer.id = 'markerLayer';
        };
        myoverlay.setMap(map);
    }

    function setBounds(){
        // bounds of the desired area
        var allowedBounds = new google.maps.LatLngBounds(
             new google.maps.LatLng(-54.908301749921485, -180), 
             new google.maps.LatLng(65.64355817622092, 180)
        );
        var lastValidCenter = map.getCenter();

        google.maps.event.addListener(map, 'center_changed', function() {
            if (allowedBounds.contains(map.getCenter())) {
                // still within valid bounds, so save the last valid position
                lastValidCenter = map.getCenter();
                return; 
            }
            // not valid anymore => return to last valid position
            map.panTo(lastValidCenter);
        });
    }

    function initializeSettings(){
        var settings = getJsonObject(CONFIG_FILE);

        isStyleEnabled  = settings.enable_style;
        styleName       = settings.style;
        centerLatitude  = settings.center_latitude;
        centerLongitude = settings.center_longitude;
        defaultZoom     = settings.default_zoom;
        homeIcon        = settings.home_icon;
        cityIcon        = settings.city_icon;
        countryIcon     = settings.country_icon;
        isInfoDialogEnabled     = settings.enable_info_dialog;
        isCountryMarkersEnabled = settings.enable_country_markers;
        isCityMarkersEnabled    = settings.enable_city_markers;
    }

    function initializeMap(){
        map = new google.maps.Map(document.getElementById('map'), {
            zoom: defaultZoom,
            center: {
                lat: centerLatitude,
                lng: centerLongitude
            },
            options: {
                minZoom: 2,
                maxZoom: 10,
                draggable: true
            }               
        });

        if(isStyleEnabled && styleName){
            map.set('styles', JSON.parse(getStyleFromJson(styleName)));
        }

        setBounds();
    }

    function addVisitedMarkers(){
        for(var i=0; i<visitedCountriesList.length; i++){  
            addMarkerForCountry(visitedCountriesList[i].short_name);            

            addMarkerForCity(visitedCountriesList[i].cities_visited);
        }
    }

    function addMakerForHome(){

    }

    function addMarkerForCity(visitedCitiesList){
        for(var i=0; i<visitedCitiesList.length; i++){ 
            var name = visitedCitiesList[i].city_name;
            var coors = visitedCitiesList[i].city_coordinates;

            var lat = parseFloat(coors[0]);
            var lng = parseFloat(coors[1]);

            addMarker(name, lat, lng, cityIcon); 
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

        addMarker(name, lat, lng, is_home ? homeIcon : countryIcon);            
    }

    function getJsonObject(filePath){
        var jsonData = getJSON(filePath);
        return JSON.parse(jsonData);
    }

    function getStyleFromJson(styleName){
        var jsonObj = getJsonObject(MAP_STYLES_FILE);

        for(var i=0; i<jsonObj.length; i++){
            if(jsonObj[i].name === styleName){
                return jsonObj[i].style;
            }            
        }


        console.log("Style \""+ styleName +"\" not Found!");
    }

    function getCountryCentoidsFromJSON(){
        var jsonObj = getJsonObject(COUNTRY_CENTOIDS_FILE);

        for(var i=0; i<jsonObj.length; i++){                 
            var tmpCountry = new Country(jsonObj[i].id, jsonObj[i].short_name, 
                                         jsonObj[i].long_name, jsonObj[i].latitude,
                                         jsonObj[i].longitude);   

            countryCenterLookupDict[tmpCountry.short_name] = tmpCountry;              
        }
    }

    function getVisitedCountriesFromJSON(){
        var jsonObj = getJsonObject(VISITED_COUNTRIES_FILE);

        for(var i=0; i<jsonObj.length; i++){
            var tmpCountry = countryCenterLookupDict[jsonObj[i].country_name];
            tmpCountry.is_visited     = true;
            tmpCountry.year_visited   =  jsonObj[i].year_visited;
            tmpCountry.duration       =  jsonObj[i].duration;
            tmpCountry.cities_visited =  jsonObj[i].cities_visited;
            tmpCountry.is_home        =  jsonObj[i].is_home;               

            visitedCountriesList.push(tmpCountry);  

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

    function UrlExists(url){
        var http = new XMLHttpRequest();
        http.open('HEAD', url, false);
        http.send();
        return http.status!=404;
    }

    var hoverwindow = null;
    var clickwindow = null;
    function addMarker(name, lat, lng, icon) {

        // //Set marker to icon in config.json
        // var url = is_home ? IMAGE_PATH + homeIcon : IMAGE_PATH + cityIcon;
        // //Fallback to defaults if icon is not found
        // if(!UrlExists(url)){
        //     console.log("Icon \""+ url +"\" not Found!");
        //     url = is_home ? IMAGE_PATH + BLUE_PIN : IMAGE_PATH + RED_PIN;
        // }

        var url = IMAGE_PATH + icon;

        //Create new marker
        var marker = new google.maps.Marker({
            position: {
                lat: lat,
                lng: lng
            },
            map: map,
            // set the icon as markerIcon declared above
            icon: {
                url: url,
                size: new google.maps.Size(12, 12), //marker image size
                origin: new google.maps.Point(0, 0), // marker origin
                anchor: new google.maps.Point(12, 12) // X-axis value (35, half of marker width) and 86 is Y-axis value (height of the marker).
            },
            // must use optimized false for CSS
            optimized: false,
            name: name
        });

        //create marker listeners to handle info dialog if setting is enabled
        if(isInfoDialogEnabled){
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
        }

        markerList.push(marker);
    }

    function getInfoWindow(marker){
        var country = countryCenterLookupDict[marker.name];
        var infoString = '<p style="text-align:center;">' + country.long_name + '</p>' +
        '<p> Visited in ' + country.year_visited + '!</p>' +
        '<p> Cities Explored: ' + country.cities_visited + '</p>' +
        '<p style="text-align:center;"><img src="images/pin_red.gif" style="width:64px;height:64px;align="center"></p>';

        return new google.maps.InfoWindow({
                     content: infoString,
                     map: map
                   });
    }