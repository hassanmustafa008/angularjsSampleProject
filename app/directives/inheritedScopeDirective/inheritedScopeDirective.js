"use strict";
angular.module("app").directive("inheritedScopeDirective", ["$log", function ($log) {
  return {
    templateUrl: "app/directives/inheritedScopeDirective/inheritedScopeDirective.html",
    restrict: 'E',
    scope: true,
    link: function () {
      console.log();
    },
    controller:function ($scope) {
      debugger;
    }
  }
}]);
