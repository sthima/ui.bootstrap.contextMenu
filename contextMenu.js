angular.module('ui.bootstrap.contextMenu', [])

.directive('contextMenu', ["$parse", "$q", function ($parse, $q) {

    var contextMenus = [];

    var removeContextMenus = function (level) {
        while (contextMenus.length && (!level || contextMenus.length > level)) {
            contextMenus.pop().remove();
        }
        if (contextMenus.length == 0 && $currentContextMenu) {
            $currentContextMenu.remove();
        }
    };

    var $currentContextMenu = null;

    var renderContextMenu = function ($scope, event, options, model, level) {
        if (!level) { level = 0; }
        if (!$) { var $ = angular.element; }
        $(event.currentTarget).addClass('context');
        var $contextMenu = $('<div>');
        if ($currentContextMenu) {
            $contextMenu = $currentContextMenu;
        } else {
            $currentContextMenu = $contextMenu;
        }
        $contextMenu.addClass('dropdown clearfix');
        var $ul = $('<ul>');
        $ul.addClass('dropdown-menu');
        $ul.attr({ 'role': 'menu' });
        $ul.css({
            display: 'block',
            position: 'absolute',
            left: event.pageX + 'px',
            top: event.pageY + 'px',
            "z-index": 10000
        });
        var $promises = [];
        angular.forEach(options, function (item, i) {
            var $li = $('<li>');
            if (item.icon){
                $li.addClass(item.icon);
            }

            if (item === null) {
                $li.addClass('divider');
            } else {
                var $a = $('<a>');
                $a.css("padding-right", "8px");
                $a.attr(angular.extend({ tabindex: '-1', href: '#'}, item.attrs));

                var nestedMenu = item.nestedMenu;
                var text = item.label.call($scope, $scope, event, model);
                var enabled = item.enabled.call($scope, $scope, event, model, text);

                $promise = $q.when(text)
                $promises.push($promise);
                $promise.then(function (text) {
                    if (nestedMenu) {
                        $a.css("cursor", "default");
                        $a.append($('<strong style="font-family:monospace;font-weight:bold;float:right;">&gt;</strong>'));
                    }
                    $a.append(text);
                });

                $li.append($a);

                //var enabled = angular.isFunction(item[2]) ? item[2].call($scope, $scope, event, model, text) : true;
                if (enabled) {
                    var openNestedMenu = function ($event) {
                        removeContextMenus(level + 1);
                        var ev = {
                            pageX: event.pageX + $ul[0].offsetWidth - 1,
                            pageY: $ul[0].offsetTop + $li[0].offsetTop - 3
                        };
                        renderContextMenu($scope, ev, nestedMenu, model, level + 1);
                    }
                    $li.on('click', function ($event) {
                        $event.preventDefault();
                        $scope.$apply(function () {
                            if (nestedMenu) {
                                openNestedMenu($event);
                            } else {
                                $(event.currentTarget).removeClass('context');
                                removeContextMenus();
                                item.onEnd.call($scope, $scope, $event, model, text);
                            }
                        });
                    });

                    $li.on('mouseover', function ($event) {
                        $scope.$apply(function () {
                            if (nestedMenu) {
                                openNestedMenu($event);
                            }
                        });
                    });
                } else {
                    $li.on('click', function ($event) {
                        $event.preventDefault();
                    });
                    $li.addClass('disabled');
                }
            }
            $ul.append($li);
        });
        $contextMenu.append($ul);
        var height = Math.max(
            document.body.scrollHeight, document.documentElement.scrollHeight,
            document.body.offsetHeight, document.documentElement.offsetHeight,
            document.body.clientHeight, document.documentElement.clientHeight
        );
        $contextMenu.css({
            width: '100%',
            height: height + 'px',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 9999
        });
        $(document).find('body').append($contextMenu);

        //calculate if drop down menu would go out of screen at left or bottom
        // calculation need to be done after element has been added (and all texts are set; thus thepromises)
        // to the DOM the get the actual height
        $q.all($promises).then(function(){
            if(level === 0){
                var topCoordinate = event.pageY;
                var menuHeight = angular.element($ul[0]).prop('offsetHeight');
                var winHeight = event.view.innerHeight;
                if (topCoordinate > menuHeight && winHeight - topCoordinate < menuHeight) {
                    topCoordinate = event.pageY - menuHeight;
                }

                var leftCoordinate = event.pageX;
                var menuWidth = angular.element($ul[0]).prop('offsetWidth');
                var winWidth = event.view.innerWidth;
                if(leftCoordinate > menuWidth && winWidth - leftCoordinate < menuWidth){
                    leftCoordinate = event.pageX - menuWidth;
                }

                $ul.css({
                    display: 'block',
                    position: 'absolute',
                    left: leftCoordinate + 'px',
                    top: topCoordinate + 'px'
                });
            }
        });

        $contextMenu.on("mousedown", function (e) {
            if ($(e.target).hasClass('dropdown')) {
                $(event.currentTarget).removeClass('context');
                removeContextMenus();
            }
        }).on('contextmenu', function (event) {
            $(event.currentTarget).removeClass('context');
            event.preventDefault();
            removeContextMenus(level);
        });
        $scope.$on("$destroy", function () {
            removeContextMenus();
        });

        contextMenus.push($ul);
    };
    return function ($scope, element, attrs) {
        element.on('contextmenu', function (event) {
            event.stopPropagation();
            $scope.$apply(function () {
                event.preventDefault();
                var options = $scope.$eval(attrs.contextMenu);
                var model = $scope.$eval(attrs.model);
                if (options instanceof Array) {
                    if (options.length === 0) { return; }
                    renderContextMenu($scope, event, options, model);
                } else {
                    throw '"' + attrs.contextMenu + '" not an array';
                }
            });
        });
    };
}]);

function ContextMenuOption(options) {

    to_function = function (attr){
        if (typeof attr == 'string'){
            return function() { return attr; }
        }
        return attr || function(){return true};
    };

    this.label = to_function(options.label);
    this.enabled = to_function(options.enabled);
    this.icon = options.icon;
    this.attrs = options.attrs || {};
    this.nestedMenu = options.nestedMenu;
    this.onEnd = options.onEnd;
};
