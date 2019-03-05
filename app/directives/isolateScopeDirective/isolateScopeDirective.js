(function (app) {
  "use strict";
  app.directive("isolateScopeDirective", ["$log", function ($log) {
    return {
      templateUrl: "app/directives/isolateScopeDirective/isolateScopeDirective.html",
      restrict: 'E',
      scope: {},
      link: function () {
        console.log("Isolate");
      },
      controller: function ($scope) {
        console.log($scope);
      }
    }
  }]);
  app.directive("isolateScopeDirectiveStr", ["$log", function ($log) {
    return {
      template: '<input type="text" ng-model="sharedStr" class="form-control"\n' +
      'placeholder="Isolate Child">',
      restrict: 'E',
      scope: {
        sharedStr: '@'
      },
      link: function () {
        console.log("Isolate");
      },
      controller: function ($scope) {
        console.log($scope);
      }
    }
  }]);
  app.directive("isolateScopeDirectiveObj", ["$log", function ($log) {
    return {
      template: '<input type="text" ng-model="sharedObj" class="form-control"\n' +
      'placeholder="Isolate Child">',
      restrict: 'E',
      scope: {
        sharedObj: '='
      },
      link: function () {
        console.log("Isolate");
      },
      controller: function ($scope) {
        console.log($scope);
      }
    }
  }]);
  app.directive("isolateScopeDirectiveFun", ["$log", function ($log) {
    return {
      template: '<br><button class="btn btn-light" ng-click="sharedFun({directive: true})">I am from directive</button>',
      restrict: 'E',
      scope: {
        sharedFun: '&'
      },
      link: function () {
        console.log("Isolate");
      },
      controller: function ($scope) {
        console.log($scope);
      }
    }
  }]);
})(angular.module("app"));
