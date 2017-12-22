ymaps.ready(init);
var timeSlider = null;
var myMap = null;

function init() {
    var geolocation = ymaps.geolocation;
    myMap = new ymaps.Map('map', {
            center: [55, 34],
            zoom: 10
        }, {
            searchControlProvider: 'yandex#search'
        });

    geolocation.get({
        provider: 'browser',
        mapStateAutoApply: false
    }).then(function (result) {
        // Синим цветом пометим положение, полученное через браузер.
        // Если браузер не поддерживает эту функциональность, метка не будет добавлена на карту.
        result.geoObjects.options.set('preset', 'islands#blueCircleIcon');
        myMap.geoObjects.add(result.geoObjects);

        myMap.setCenter(result.geoObjects.position);
        myMap.setZoom(12);
    });

    // Создаем собственный класс.
    timelineControlClass = function (options) {
        timelineControlClass.superclass.constructor.call(this, options);
        this._$content = null;
        this._geocoderDeferred = null;
    };
    // И наследуем его от collection.Item.
    ymaps.util.augment(timelineControlClass, ymaps.collection.Item, {
        onAddToMap: function (map) {
            timelineControlClass.superclass.onAddToMap.call(this, map);
            this._lastCenter = null;
            this.getParent().getChildElement(this).then(this._onGetChildElement, this);
        },

        onRemoveFromMap: function (oldMap) {
            this._lastCenter = null;
            if (this._$content) {
                this._$content.remove();
                this._mapEventGroup.removeAll();
            }
            timelineControlClass.superclass.onRemoveFromMap.call(this, oldMap);
        },

        _onGetChildElement: function (parentDomContainer) {
            // Создаем HTML-элемент с текстом.
            this._$content = $('<input id="ex8" data-slider-id="ex1Slider" type="text" data-slider-min="0" data-slider-max="99" data-slider-step="1" data-slider-value="99"/>')
                .appendTo(parentDomContainer);
            $("#ex8").css({'width': $(window).width() - 680});

            timeSlider = $("#ex8").slider({
                tooltip: 'always',
                tooltip_position: 'bottom',
                formatter: function(value) {
                    var interval = getTimelineInterval(value);
                    var left = new Date().addMinutes(-1 * parseInt(interval[0]));
                    var right = new Date().addMinutes(-1 * parseInt(interval[1]));
                    return 'Интервал: ' + left.toString('d MMM HH:mm') + ' - ' + right.toString('d MMM HH:mm');
                }
            });
            timeSlider.on('change', function() {
                buildMap(myMap)
            });

            this._mapEventGroup = this.getMap().events.group();
            // Запрашиваем данные после изменения положения карты.
            this._mapEventGroup.add('boundschange', this._createRequest, this);
            // Сразу же запрашиваем название места.
            this._createRequest();
        },

        _createRequest: function() {
        },
    });

    var customControl = new timelineControlClass();
    myMap.controls.add(customControl, {
        float: 'none',
        position: {
            top: 15,
            left: 400
        }
    });

    // Создаем собственный класс.
    legendControlClass = function (options) {
        legendControlClass.superclass.constructor.call(this, options);
        this._$content = null;
        this._geocoderDeferred = null;
    };
    // И наследуем его от collection.Item.
    ymaps.util.augment(legendControlClass, ymaps.collection.Item, {
        onAddToMap: function (map) {
            legendControlClass.superclass.onAddToMap.call(this, map);
            this._lastCenter = null;
            this.getParent().getChildElement(this).then(this._onGetChildElement, this);
        },

        onRemoveFromMap: function (oldMap) {
            this._lastCenter = null;
            if (this._$content) {
                this._$content.remove();
                this._mapEventGroup.removeAll();
            }
            legendControlClass.superclass.onRemoveFromMap.call(this, oldMap);
        },

        _onGetChildElement: function (parentDomContainer) {
            this._$content = $('<div class="panel panel-default">' +
                '  <div class="panel-body">' +
                '    <div>Укажите запах, который ощущаете:</div><br/>' +
                '    <a class="badge" href="javascript: markGas(\'h2s\');" style="background-color:#fd464e;">Сероводород</a>' +
                '    <a class="badge" href="javascript: markGas(\'gas\');" style="background-color:#2bb7fd;">Бытовой газ</a>' +
                '    <a class="badge" href="javascript: markGas(\'soot\');" style="background-color:#727271;">Запах гари</a>' +
                '    <br/><br/><div><a href="https://devprom.ru/h2s">Мобильная версия</a></div><div><a target="_blank" href="https://github.com/cutecare/gas-map">Исходный код</a></div>' +
                '  </div>' +
                '</div>')
                .appendTo(parentDomContainer);

            this._mapEventGroup = this.getMap().events.group();
            // Запрашиваем данные после изменения положения карты.
            this._mapEventGroup.add('boundschange', this._createRequest, this);
            // Сразу же запрашиваем название места.
            this._createRequest();
        },

        _createRequest: function() {
        },
    });

    var customControl = new legendControlClass();
    myMap.controls.add(customControl, {
        float: 'right',
        position: {
            top: 48,
            left: 47
        }
    });

    buildMap(myMap);
    setInterval(function(myMap){
        buildMap(myMap);
    }, 10000, myMap);
}

function getTimelineInterval( value )
{
    var timeValue = timeSlider ? (parseInt(100 - (!value ? timeSlider.slider('getValue') : value)) * 10) : 10;
    return [timeValue, (Math.max(0,timeValue-60))];
}

function buildMap( myMap ) {
    var items = new Object();
    var timelineInterval = getTimelineInterval();
    $.ajax({
        url: "https://devprom.ru:9201/metrics/_search?pretty=true",
        type: "POST",
        async: true,
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        data: JSON.stringify({
            'query': {
                'constant_score': {
                    'filter': {
                        'range': {
                            '@timestamp': {
                                "gt" : "now-" + timelineInterval[0] + "m",
                                "lt" : "now-" + timelineInterval[1] + "m"
                            }
                        }
                    }
                }
            },
            'sort': [
                { "@timestamp" : {"order" : "desc"}}
            ]
        }),
        complete: function(data) {
            $.each(data.responseJSON.hits.hits, function(index, item) {
                var key = item._source.source;
                if ( !items[key] ) {
                    items[key] = {
                        'location': [item._source.location.lat, item._source.location.lon],
                        'opacity': item._source.value / 100,
                        'gas' : item._source.gas
                    };
                }
            });
            myMap.geoObjects.each(function(el, i) {
                var key = el.properties._data.source;
                if ( !key ) return true;
                if ( !items[key] ) {
                    myMap.geoObjects.remove(el);
                }
                else {
                    var item = items[key];
                    if ( el.properties._data.value != item.opacity || el.properties._data.gas != item.gas ) {
                        myMap.geoObjects.set(i, buildArea(myMap, key, item));
                    }
                    items[key] = null;
                }
            });
            $.each(items, function(index, item) {
                if ( item ) {
                    myMap.geoObjects.add(buildArea(myMap, index, item));
                }
            });
        }
    })
}

function buildArea( myMap, source, item ) {
    var myCircle = new ymaps.Circle([
        // Координаты центра круга.
        item.location,
        // Радиус круга в метрах.
        350
    ], {
        // Описываем свойства круга.
        // Содержимое балуна.
        balloonContent: "Радиус круга - 10 км",
        // Содержимое хинта.
        hintContent: "Подвинь меня",
        source: source,
        value: item.opacity,
        gas: item.gas
    }, {
        // Задаем опции круга.
        // Включаем возможность перетаскивания круга.
        draggable: false,
        // Цвет заливки.
        // Последний байт (77) определяет прозрачность.
        // Прозрачность заливки также можно задать используя опцию "fillOpacity".
        fillColor: (item.gas == 'h2s' ? "#fd464e" : (item.gas == 'gas' ? "#2bb7fd" : "#727271" )),
        fillOpacity: item.opacity,
        // Цвет обводки.
        strokeColor: "#c6aa39",
        // Прозрачность обводки.
        strokeOpacity: 0.5,
        // Ширина обводки в пикселях.
        strokeWidth: 1
    });

    return myCircle;
}

function markGas( type ) {
    gasFound(type);
    navigator.geolocation.getCurrentPosition(function(position) {
        myMap.setCenter([position.coords.latitude,position.coords.longitude], 15);
    });
    setTimeout(function() {
        buildMap(myMap);
    }, 3000);
}