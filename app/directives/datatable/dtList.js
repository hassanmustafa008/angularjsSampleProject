'use strict';
angular.module('app')
  .directive('dtList', ['$log', '$compile', '$state', '$timeout', 'sharedDatasvc', 'globalsvc', 'miscUtils', 'CONST','INTEGRATIONCONST',
    function ($log, $compile, $state, $timeout, sharedDatasvc, globalsvc, miscUtils, CONST,INTEGRATIONCONST) {
      return {
        restrict: 'EA',
        templateUrl: 'app/directives/js/DataTablesDirective/html/custome-table-view.html',
        scope: {
          viewLocation: '&',
          editData: '&',
          refreshData: '&',
          cwData: '&',               // Added by Fahid Sami to redirect to CW record
          deleteData: '&',
          downloadData: '&',
          cancelData: '&',
          userInvite: '&',
          toggleSyncing: '&',
          startSyncing: '&',
          changePasword: '&',
          printData: '&',
          viewData: '&',
          contactDashboard: '&',
          showResetExpiryModal: '&',
          kbExportPdf: '&',
          kbExportDocs: '&',
          configObject: '=',
          searchModal: "@",
          updateFromList: "@",
          list: '=', // list of data
          aoColumns: '=', // list of columns for datatable
          dtOptions: '=', // custome configurations
          excludeRgFor: '=?', // changing search pattern for special columns Rg(regular expression)
          tableId: '@?',
          linkColumnFunction: '&',
          rowCallBack: '&',
          mainTag: '@?',
          colvisBid: '@?',
          kbModal: "@",
          scroll: '&',
          addData: '&',
          bulkDelete: '&',
          changeList: '=',
          showItbLoader:'&'
        },
        controller: ['$scope', '$rootScope', '$filter', '$timeout', '$state', function ($scope, $rootScope, $filter, $timeout, $state) {
          $scope.showDTLoader = false;
          $scope.scrollerPos = 0;
          $scope.noVisibility = false;
          if ($scope.mainTag !== undefined) {
            $scope.mainDivId = $scope.mainTag;
          } else {
            $scope.mainDivId = "dt";
          }

          $scope.$on("$destroy", function () {
            $(window).off("resize.Viewport");
            var host = document.getElementById($scope.mainDivId);
            if (host) {
              var mainDiv = $("#" + $scope.mainDivId);
              mainDiv.empty();
              angular.element(host).empty();
            }
          });

          var userType = sharedDatasvc.getUser().userType;
          var scrollEnd, scrollTotal = 0;
          $scope.$on("$destroy", function (event) {
            $timeout.cancel(event);
          });

          $timeout(function () {
            (function () {
              if (typeof $scope.aoColumns[$scope.aoColumns.length - 1].mRender === "function") {
                $scope.aoColumns.splice($scope.aoColumns.length - 1, 1);
              }
            })();
            $("#" + $scope.mainDivId).empty();
            if ($scope.tableId === undefined) {
              $scope.tableId = "example";
            }
            ;

            $("#" + $scope.mainDivId).append('<table class="table table-striped row-border hover custom_tbl" cellspacing="0" id="' + $scope.tableId + '"><thead></thead><tfoot></tfoot></table>');
            /************ datatable variable for further use *************/
            $scope.table = "";
            /***************** generate dynamic html to make DataTable generic ***************/
            var tableHtml = '';
            /*********************************Function Declaration**********************************/
            var tableConfigurations = undefined; //configuration of datatable(i.e arrrangement of columns etc)
            (function () {
              var userListSettings = sharedDatasvc.getUser().userListSettings;
              if (userListSettings !== undefined) {
                if (userListSettings.length > 0) {
                  if ($state.current.name != "app.customTemplatesData.list") {
                    var currentStateName = $state.current.name;
                  } else {
                    var coop = sharedDatasvc.getUser();
                    var currentStateName = coop.temp01.ITBTemplateName;
                  }
                  for (var i = 0; i < userListSettings.length; i++) {
                    if ($scope.dtOptions.saveStateName && $scope.dtOptions.saveStateName != null && $scope.dtOptions.saveStateName != "") {
                      if ($scope.dtOptions.saveStateName === userListSettings[i].name) {
                        tableConfigurations = userListSettings[i].dataTableSettings;
                        break;
                      }
                    }
                    else {
                      if (currentStateName === userListSettings[i].name) {
                        tableConfigurations = userListSettings[i].dataTableSettings;
                        break;
                      }
                    }
                  }
                }
              }
            })();
            /*********************************function to configure DataTableObject to make it generic**********************************/
            var count = 0;
            function checkPermission(object,operation){
              if(!miscUtils.isUndefined(object.userPermission)){
                if(object.userPermission.length>0){
                  var userInfo = sharedDatasvc.getUser();
                  var tempPermi=[];
                  for(var up in object.userPermission){
                    if (userInfo.userGroups && userInfo.userGroups.length > 0) {
                      for (var j = 0; j < userInfo.userGroups.length; j++) {
                        if (object.userPermission[up].id == userInfo.userId || userInfo.userGroups[j].uuid == object.userPermission[up].id) {
                          tempPermi=Array.from(new Set(tempPermi.concat(object.userPermission[up].permission)));
                        }
                      }
                    }else {
                      if (object.userPermission[up].id == userInfo.userId) {
                        tempPermi=Array.from(new Set(tempPermi.concat(object.userPermission[up].permission)));
                      }
                    }
                  }
                  return tempPermi.indexOf(operation) > -1;
                }else{
                  return "undefined";
                }
              }else{
                return "undefined";
              }
            }
            function permissionToApply(companyPermission,recordPermission,object){
              if(companyPermission != true && companyPermission != false){     // because MiscUtils.isundefined(false) gives false
                return false;
              }
              if(sharedDatasvc.getUser().canAccessAll){
                setBulkDelete(object,true);
                return true;
              }
              if(recordPermission != "undefined"){
                setBulkDelete(object,recordPermission);
                return recordPermission;
              }else{
                setBulkDelete(object,companyPermission);
                return companyPermission;
              }
            }
            function setBulkDelete(object,permission){
              if(!miscUtils.isUndefined(object)){
                object.bulkDelete = permission;
              }
            }

            function configureDataTableObject() {
              /***********************  creating curd buttons  ****************/
              if ($scope.dtOptions.actionButtons.displayColumn === true) {
                $scope.aoColumns.push({
                  data: $scope.dtOptions.actionButtons.colName,
                  defaultContent: 'N/A',
                  "mRender": function (data, type, object, row) {
                    count++;
                    var actionButtonsHtml = "";
                    var user = sharedDatasvc.getUser();
                    /**** ---->>>>>>set edit to undefined instead of false to hide button.<<<<<<<<<-----------********/
                    if (permissionToApply($scope.dtOptions.actionButtons.buttonsConfig.edit , checkPermission(object,"put")) && ($state.current.name !== 'app.domainTracker.list' && $state.current.name !== 'app.ssl.list')) {
                      actionButtonsHtml += '<button id="edit"' + row.row + '  data-placement="bottom" data-toggle="tooltip" data-original-title="Edit" ui-jq="tooltip" class="editBtnX btn btn-default btn-xs m-r-5"' + '> <img src="assets/img/icon_edit_s.svg" width="17px"> </button>';
                    }
                    if ($scope.dtOptions.actionButtons.buttonsConfig.location == true) {
                      actionButtonsHtml += '<button id="location"' + row.row + ' class="locationBtnX btn btn-default btn-xs"' + '> <i class="pe-7s-map-marker" style="font-size:20px" aria-hidden="true"></i> </button>';
                    }/**** ---->>>>>>set delete to undefined instead of false to hide button.<<<<<<<<<-----------********/
                    if (permissionToApply($scope.dtOptions.actionButtons.buttonsConfig.delete , checkPermission(object,"delete"), object)) {
                      if ($scope.dtOptions.actionButtons.buttonsConfig.csvExport) {
                        if(object.status == 'In Queue') {
                          actionButtonsHtml += '<button id="delete"' + row.row + '  data-placement="bottom" data-toggle="tooltip" data-original-title="Delete" ui-jq="tooltip" class="deleteBtnX btn btn-default' + ' btn-xs m-r-5"> <img src="assets/img/icon_delete_s.svg" width="17px"> </button>';
                        }
                      }
                      else {
                        actionButtonsHtml += '<button id="delete"' + row.row + ' data-placement="bottom" data-toggle="tooltip" data-original-title="Delete" ui-jq="tooltip" class="deleteBtnX btn btn-default' + ' btn-xs m-r-5"> <img src="assets/img/icon_delete_s.svg" width="17px"> </button>';
                      }
                    }
                    if ($scope.dtOptions.actionButtons.buttonsConfig.cwBtn === true && object.id && (userType != CONST.USERTYPE.EXTERNAL && user.mainIntegration == INTEGRATIONCONST.CONNECTWISE && userType != CONST.USERTYPE.EXTERNAL.toLowerCase())) {
                      actionButtonsHtml += '<button id="cwBtn"' + row.row + ' data-placement="bottom" data-toggle="tooltip" data-original-title="Connectwise" ui-jq="tooltip" class="cwBtnX btn btn-default' + ' btn-xs"> <img src="../assets/img/icon_cw_v.svg" width="22px" class="v-align-top"> </button>';
                    }
                    if ($scope.dtOptions.actionButtons.buttonsConfig.cwBtn === true && object.id && (userType != CONST.USERTYPE.EXTERNAL && user.mainIntegration == INTEGRATIONCONST.AUTOTASK && userType != CONST.USERTYPE.EXTERNAL.toLowerCase())) {
                      actionButtonsHtml += '<button id="cwBtn"' + row.row + ' data-placement="bottom" data-toggle="tooltip" data-original-title="Autotask" ui-jq="tooltip" class="cwBtnX btn btn-default' + ' btn-xs"> <img src="../assets/img/sync_autotask.png" width="22px" class="v-align-top"> </button>';
                    }
                    if ($scope.dtOptions.actionButtons.buttonsConfig.searchModal === true || (($state.current.name == 'app.domainTracker.list' || $state.current.name == 'app.ssl.list') && checkPermission(object,"put") == true)) {
                      actionButtonsHtml += '<button id="searchTagslist"' + row.row + '  data-placement="bottom" data-toggle="tooltip" data-original-title="Tags" ui-jq="tooltip" class="searchBtnX btn btn-default' + ' btn-xs m-r-5"> <img src="assets/img/icon_update_tags.svg" width="17" id="searchTagslist"> </button>';
                    }
                    if ($scope.dtOptions.actionButtons.buttonsConfig.updateFromList === true) {
                      actionButtonsHtml += '<button id="updateFromList"' + row.row + ' class="updateFromListBtnX btn btn-default btn-xs"> <i class="pe-7s-repeat" style="font-size:22px; padding-left:3px;" aria-hidden="true"></i> </button>';
                    }
                    if ($scope.dtOptions.actionButtons.buttonsConfig.userInvite === true) {
                      actionButtonsHtml += '<button id="userInvite"' + row.row + ' data-placement="bottom" data-toggle="tooltip" data-original-title="Send Invite" ui-jq="tooltip" class="userInviteBtnX btn btn-default' + ' btn-xs m-r-5"><img src="assets/img/icon_sendinvite_s.svg" width="17px"> </button>';
                    }
                    if ($scope.dtOptions.actionButtons.buttonsConfig.toggleSyncing === true && object.psaName) {
                      if(object.status.toLowerCase() === "paused") {
                        actionButtonsHtml += '<button id="toggleSyncing"' + row.row + ' class="toggleSyncingBtnX btn btn-default' + ' btn-xs m-r-5 m-l-5" data-placement="bottom" data-toggle="tooltip" data-original-title="Play" ui-jq="tooltip"> <img src="assets/img/icon_startmanual.png" width="20" id="searchTagslist" >  </button>';
                      }else {
                        actionButtonsHtml += '<button id="toggleSyncing"' + row.row + ' class="toggleSyncingBtnX btn btn-default' + ' btn-xs m-r-5 m-l-5" data-placement="bottom" data-toggle="tooltip" data-original-title="Pause" ui-jq="tooltip" > <img src="assets/img/icon_syncpause.png" width="20" id="searchTagslist" > </button>';
                      }
                    }
                    if ($scope.dtOptions.actionButtons.buttonsConfig.forceStartSyncing === true && object.forceSync) {
                      actionButtonsHtml += '<button id="forceStartSyncing"' + row.row + ' class="forceStartSyncingBtnX btn btn-default' + ' btn-xs m-r-5" data-placement="bottom" data-toggle="tooltip" data-original-title="Force Start" ui-jq="tooltip"> <img src="assets/img/icon_forcestart.png" width="20"> </button>';
                    }
                    if ($scope.dtOptions.actionButtons.buttonsConfig.changePasword === true) {
                      actionButtonsHtml += '<button id="changePasword"' + row.row + ' data-placement="bottom" data-toggle="tooltip" data-original-title="Reset Password" ui-jq="tooltip" class="changePaswordBtnX btn btn-default' + ' btn-xs m-r-5  m-b-5"> <img src="assets/img/icon_refreshpassword.svg" width="17px" style="vertical-align: -webkit-baseline-middle;"> </button>';
                    }
                    if ($scope.dtOptions.actionButtons.buttonsConfig.print === true) {
                      actionButtonsHtml += '<button id="print"' + row.row + ' data-placement="bottom" data-toggle="tooltip" data-original-title="Invoice" ui-jq="tooltip" class="printBtnX btn btn-default' + ' btn-xs m-r-5"> <img src="../assets/img/icon_export_pdf.svg" width="17px"/> </button>';
                    }
                    if ($scope.dtOptions.actionButtons.buttonsConfig.kbModal === true  && object.recordStatus != "Draft" ) {
                      actionButtonsHtml += '<button id="delete"' + row.row + ' data-placement="bottom" data-toggle="tooltip" data-original-title="Copy list" ui-jq="tooltip" class="copyKbList btn btn-default' + ' btn-xs m-r-5"> <img src="assets/img/icon_duplicate.svg" width="17"> </button>';
                    }
                    if ($scope.dtOptions.actionButtons.buttonsConfig.refresh === true) {
                      actionButtonsHtml += '<button id="refresh"' + row.row + '  data-placement="bottom" data-toggle="tooltip" data-original-title="Update" ui-jq="tooltip" class="refreshBtnX btn btn-default btn-xs m-r-5"' + '> <img src="assets/img/icon_refresh_s.svg" width="17px"> </button>';
                    }
                    if ($scope.dtOptions.actionButtons.buttonsConfig.kbExportDocs === true) {
                      actionButtonsHtml += '<button id=' + 'importDocs' + count + row.row + ' data-placement="bottom" data-toggle="tooltip" data-original-title="Export Doc" ui-jq="tooltip" class="kbExportDocsBtnX btn btn-default btn-xs m-r-5 hidden-xs"' + '><img src="../assets/img/icon_export_doc.svg" width="17px" /> </button>';
                    }
                    if ($scope.dtOptions.actionButtons.buttonsConfig.kbExportPdf === true) {
                      actionButtonsHtml += '<button id=' + 'importPdf' + count + ' data-placement="bottom" data-toggle="tooltip" data-original-title="Export PDF" ui-jq="tooltip" class="kbExportPdfBtnX btn btn-default btn-xs m-r-5 hidden-xs"' + '> <img src="../assets/img/icon_export_pdf.svg" width="17px"/></button>';
                    }
                    if($scope.dtOptions.actionButtons.buttonsConfig.resetDTExpiry === true || (($state.current.name == 'app.domainTracker.list' || $state.current.name == 'app.ssl.list') && checkPermission(object,"put") == true)){
                      actionButtonsHtml += '<button id="userInvite"' + row.row + '  data-placement="bottom" data-toggle="tooltip" data-original-title="Reset Expiry Date" ui-jq="tooltip" class="resetDTExpiryBtnX btn btn-default' + ' btn-xs m-r-5"> <img src="../assets/img/icon_adddateexpire.svg"  width="17"/></button>';
                    }
                    if ($scope.dtOptions.actionButtons.buttonsConfig.download === true) {
                      actionButtonsHtml += '<button id="download"' + row.row + ' data-placement="bottom" data-toggle="tooltip" data-original-title="Download" ui-jq="tooltip" class="downloadBtnX btn btn-default btn-xs' + ' btn-xs m-r-5"> <img src="../assets/img/icon_download_launcher.svg"  width="17"/></button>';
                    }
                    if ($scope.dtOptions.actionButtons.buttonsConfig.cancelOnly === true && (object.status=='In Progress' || object.status=='In Queue') ) {
                      actionButtonsHtml += '<button id='+'cancel' + row.row + ' class="cancelOnlyX btn btn-default btn-xs' + ' btn-xs m-r-5" data-placement="bottom" data-toggle="tooltip" data-original-title="Cancel" ui-jq="tooltip"> <img src="assets/img/icon_cross_r.svg" width="20"> </button>';
                    }
                    var users="";
                    if ($scope.dtOptions.actionButtons.buttonsConfig.lock === true && object.userPermission && object.userPermission.length>0) {
                      users=object.userPermission[0].fullName;
                      for(var i=1;i<object.userPermission.length;i++){
                        users+=", "+object.userPermission[i].fullName;
                      }
                      actionButtonsHtml += '<button  data-toggle="popover" data-placement="left" title="Users" data-content="'+users+'" id="lock"' + row.row + ' data-placement="bottom" data-toggle="tooltip" data-original-title="Locked" ui-jq="tooltip" class="lockBtnX btn btn-default' + ' btn-xs m-r-5 hidden-xs"> <img src="./../../../../../assets/img/icon_locked.png"  width="20px"/></button>';
                    }
                    if ($scope.dtOptions.actionButtons.buttonsConfig.lock === true && (object.userPermission==undefined || (object.userPermission && object.userPermission.length==0))) {
                      actionButtonsHtml += '<button id="unLock"' + row.row + ' data-placement="bottom" data-toggle="tooltip" data-original-title="Set Permissions" ui-jq="tooltip" class="unLockBtnX btn btn-default' + ' btn-xs m-r-5 hidden-xs"> <img src="./../../../../../assets/img/icon_unlocked.png"  width="20px"/></button>';
                    }
                    if ($scope.dtOptions.actionButtons.buttonsConfig.contactDashboard === true) {
                      //comment due to show all contacts dashboard // iqbal
                      // if(object.phoneDirect) {
                      actionButtonsHtml += '<button id="userInvite"' + row.row + ' data-placement="bottom" data-toggle="tooltip" data-original-title="Contact Dashboard" ui-jq="tooltip" class="contactDashboardBtn btn btn-default' + ' btn-xs m-r-5"> <img src="../assets/img/icon_contact_dashboard.svg"  width="17px"/> </button>';
                      // }
                      // else{
                      //     actionButtonsHtml += '<button disabled id="userInvite"' + row.row + ' class="contactDashboardBtn btn btn-default' + ' btn-xs m-r-10"> <i class="pe-7s-id fs-20" ' + 'aria-hidden="true"></i> </button>';
                      // }
                    }
                    return actionButtonsHtml;
                  },
                });
              }
              if ($scope.excludeRgFor === undefined) {
                $scope.excludeRgFor = [];
              }
              if (typeof $scope.dtOptions.buttons.name !== "undefined") {
                dataTableConfigObject["buttons"] = [$scope.dtOptions.buttons.configObject];
              }
              if ($scope.dtOptions.saveState === true) {
                dataTableConfigObject["stateSaveCallback"] = function (setting, data) {
                  $scope.columnConfigurationObject = JSON.stringify(data);
                };
                dataTableConfigObject["stateLoadParams"] = function (settings, data) {
                  for (var i = 0; i < data.columns.length; i++) {
                    data.columns[i].search.search = "";
                  }
                };
                // dataTableConfigObject["stateLoadParams"] = function (settings, data) {
                //   data.search.search = "";
                // };
                dataTableConfigObject["stateLoadCallback"] = function () {
                  if (typeof tableConfigurations !== "undefined") {
                    return JSON.parse(tableConfigurations);
                  } else {
                    return null;
                  }
                };
              }
            };

            /*******************************function get current row object *********************************/
            function getClickedRowObject() {
              var row = $scope.table.row(this);
              var data = row.data();
              return {
                data: data,
                row: row
              }
            }

            /****************************** register click event with search text fields *********************/
            function registerEventListener() {

              var implicitPattern = '^[*].*';
              var pattern = new RegExp(implicitPattern);
              $scope.table.columns().every(function (index) {
                //if (implicitPattern.test()) {

                $('input[class^="dtSearch"]', this.footer()).off().on('keyup', function () {
                  var colName = $scope.table.columns($(this).parent().index() + ':visible').header()[0].innerText;
                  if (pattern.test(this.value) || colName.trim() === "SEARCH TAGS") {
                    var searchText = this.value.substr(0, 1) === "*" ? this.value.substr(1) : this.value;
                    $scope.table.columns($(this).parent().index() + ':visible')
                      .search(searchText)
                      .draw();
                    $(".DTFC_Cloned tbody").on('click', 'button', $scope.actionCallback)
                  }
                  else {
                    var _this = this;
                    $scope.table.columns($(this).parent().index() + ':visible')
                      .search("^" + this.value, true, false)
                      .draw().filter(function () {
                      if (_this.value.trim().length === 0) {
                        var rows = $scope.table.rows().nodes();
                        $('input[type="checkbox"]', rows).prop('checked', false);
                        $('.colHead').find('input').attr('checked', false);
                      }
                      if (isSelectAll || $scope.table.rows({'search': 'applied'})[0].length === 0) {
                        var rowList = $scope.table.rows().nodes();
                        $('input[type="checkbox"]', rowList).prop('checked', false);
                        $scope.openLink(false, null, null, null);
                      }
                    });
                    $(".DTFC_Cloned tbody").on('click', 'button', $scope.actionCallback);
                  }
                });
              });
              if ($scope.dtOptions.onHover.isHover) {

                $("#example tbody").on('mouseenter', 'td', function () {
                  sharedDatasvc.setDtRowObject($scope.table.row(this).data());
                  $(this).addClass('row_selected');
                });
              }
            }

            /****************************ACtion Column callBack****************************/
            var globelThis = "";
            $scope.actionCallback = function () {
              var row = $scope.table.row($(this).parents('tr'));
              var data = row.data();
              var className = this.className.substr(0, this.className.indexOf(' '));
              globelThis = this;
              if (className === 'editBtnX') {
                $scope.editObject(data, row);
              } else if (className === 'locationBtnX') {
                $scope.showLocation(data);
              } else if (className === 'deleteBtnX') {
                $scope.deleteObject(data, row);
              } else if (className === 'cwBtnX') {
                $scope.openCWRecord(data, row);
              } else if (className === 'resetDTExpiryBtnX') {
                $scope.showExpiryModal(data, row);
              } else if (className === 'searchBtnX') {
                $scope.searchObject(data, row);
              } else if (className === 'userInviteBtnX') {
                $scope.userInviteObject(data);
              }
              else if (className === 'contactDashboardBtn') {
                $scope.contactDashboardObject(data);
              }
              else if (className === 'toggleSyncingBtnX') {
                $scope.toggleSyncingObject(data, row);
              }
              else if (className === 'forceStartSyncingBtnX') {
                $scope.startSyncingObject(data, row);
              }
              else if (className === 'changePaswordBtnX') {
                $scope.changeUserPasswordObject(data);
              }
              else if (className === 'updateFromListBtnX') {
                $scope.updateFromList(data);
              }
              else if (className === 'printBtnX') {
                $scope.printObject(data);
              }
              else if (className === 'copyKbList') {
                $scope.kbObject(data, row);
              }
              else if (className === 'refreshBtnX'  ) {
                var skipButton = true;
                if(this.formAction.indexOf('ssl')>-1){
                  var sslRefreshList =sharedDatasvc.getsslRefreshList();
                  for (var item1 in sslRefreshList){
                    if(sslRefreshList[item1].ITBSSLLabId == data.ITBSSLLabId){
                      skipButton = false;
                      break
                    }
                  }
                }else{
                  skipButton = sharedDatasvc.getRefreshFlag();
                }
                if(skipButton) {
                  $(this).find("img").addClass("fa-spin");
                  $scope.refreshRow(data, row);
                }
              } else if (className === 'kbExportPdfBtnX' && sharedDatasvc.getExportKbPdfFlag()) {
                $(this).replaceWith('<i class="pe-7s-refresh-2 m-l-5 fa-spin" style="font-size:18px;vertical-align:middle;" aria-hidden="true">');
                globelThis = this;
                $scope.kbExportPDF(data, row);
              } else if (className === 'kbExportDocsBtnX' && sharedDatasvc.getExportKbDocsFlag()) {
                $(this).replaceWith('<i class="pe-7s-refresh-2 m-l-5 fa-spin" style="font-size:18px;vertical-align:middle;" aria-hidden="true">');
                $scope.kbExportDOCS(data, row);
              } else if (className === 'downloadBtnX'){
                $scope.downloadObject(data, row);
              }else if( className === 'cancelOnlyX'){
                $scope.cancelObj(data, row);
              }
            };

            /********************************* dynamically changing search ****************************/
            function useRegularExpressionToSearch(colName) {
              if ($scope.excludeRgFor.length > 0) {
                for (var i = 0; i < $scope.excludeRgFor.length; i++) {
                  if ($scope.excludeRgFor[i].toUpperCase() === colName.toUpperCase()) {
                    return true;
                  }
                }
                return false;
              }
              return false;
            };
            /**************** button click event callabck .... function names are obvious ***************/
            $scope.editObject = function (object, row) {
              sharedDatasvc.setCurrentItem(object);

              function UpdateRowWithOutDrawTable(data) {
                data == true ? row.remove().draw(false) : row.data(data).draw(false);
              }

              $scope.editData({UpdateRow: UpdateRowWithOutDrawTable});
            };
            $scope.openCWRecord = function (object) {
              sharedDatasvc.setCurrentItem(object);
              $scope.cwData();
            };
            $scope.showExpiryModal = function (object) {
              sharedDatasvc.setCurrentItem(object);
              $scope.showResetExpiryModal();
            };
            $scope.refreshRow = function (object) {
              sharedDatasvc.setCurrentItem(object);
              $scope.refreshData();
            };
            $scope.kbExportPDF = function (object) {
              sharedDatasvc.setCurrentItem(object);

              // $('#'+globelThis.id).replaceWith('<i class="pe-7s-refresh-2 m-l-5 fa-spin" style="font-size:20px;vertical-align:sub;" aria-hidden="true">');
              $scope.kbExportPdf();
            };
            $scope.kbExportDOCS = function (object) {
              sharedDatasvc.setCurrentItem(object);
              $('#' + globelThis.id).replaceWith('<i class="pe-7s-refresh-2 m-l-5 fa-spin" style="font-size:18px;vertical-align:middle;" aria-hidden="true">');
              $scope.kbExportDocs();
            };
            $scope.deleteObject = function (object, row) {
              sharedDatasvc.setCurrentItem(object);

              function deleteRow(isDeleteRow) {
                if (isDeleteRow === undefined) {
                  isDeleteRow === false;
                }
                if (isDeleteRow === true) {
                  //$scope.scrollerState = $(".dataTables_scrollBody").scrollTop();
                  row.remove().draw(false);
                }
              }

              $scope.deleteData({callBack: deleteRow});
            };
            $scope.downloadObject = function (object, row) {
              sharedDatasvc.setCurrentItem(object);
              $scope.downloadData();
            };
            $scope.cancelObj = function (object, row) {
              sharedDatasvc.setCurrentItem(object);
              $scope.cancelData();
            };
            $scope.printObject = function (object) {
              sharedDatasvc.setCurrentItem(object);
              $scope.$parent.print(object);
            };
            $scope.showLocation = function (object) {
              sharedDatasvc.setCurrentItem(object);
              $scope.$parent.showMap(object);
            };
            $scope.contactDashboardObject = function (object) {
              sharedDatasvc.setCurrentItem(object);
              $scope.contactDashboard(object);
            };
            $scope.searchObject = function (object) {
              sharedDatasvc.setCurrentItem(object);
              $scope.$parent.searchModal(object);
            };
            $scope.updateFromList = function (object) {
              sharedDatasvc.setCurrentItem(object);
              $scope.$parent.updateFromList(object);
            };
            $scope.changeUserPasswordObject = function (object) {
              sharedDatasvc.setCurrentItem(object);
              $scope.$parent.changePasword(object);
            }
            $scope.userInviteObject = function (object) {
              sharedDatasvc.setCurrentItem(object);

              function registerActionButtonEvents() {
                $(".DTFC_Cloned tbody").off().on('click', 'button', $scope.actionCallback);
              }

              $scope.userInvite({registerEvents: registerActionButtonEvents});
            };
            $scope.toggleSyncingObject = function (object, row) {
              sharedDatasvc.setCurrentItem(object);

              function UpdateObject(data) {
                row.data(data).draw(false);
              }

              $scope.toggleSyncing({updateRow: UpdateObject});
            };
            $scope.startSyncingObject = function (object, row) {
              sharedDatasvc.setCurrentItem(object);

              function UpdateObject(data) {
                row.data(data).draw(false);
              }

              $scope.startSyncing({updateRow: UpdateObject});
            };
            $scope.kbObject = function (object) {
              sharedDatasvc.setCurrentItem(object);
              $scope.$parent.copyKbModal(object);
            };
            $scope.openLink = function (selectAllFlag, colName, object, isCheckedFlag) {
              $scope.linkColumnFunction({
                selectAllFlag: selectAllFlag,
                colName: colName,
                object: object,
                checkedStatus: isCheckedFlag
              });
            }
            $scope.scrollMethod = function () {
              $(document).ready(function () {
                if ($scope.mainTag === "comapniesListMainTage") {
                  $('#' + $scope.mainTag + ' .dataTables_scrollBody').scroll(function () {
                    var data = {};
                    // data.scrollEnd = $('#' + $scope.mainTag + ' .dataTables_scrollBody')[0].scrollTop;
                    //  data.scrollTotal = $('#' + $scope.mainTag + ' .dataTables_scrollBody')[0].scrollHeight;
                    //  $scope.scroll({data: data});
                  });
                }
                else if ($scope.mainTag === "tickListModalMainTags" || $scope.mainTag ==="ticketDetails") {
                  $('#' + $scope.mainTag + ' .dataTables_scrollBody').scroll(function () {
                    var data = {};
                    data.scrollEnd = $('#' + $scope.mainTag + ' .dataTables_scrollBody')[0].scrollTop;
                    data.scrollTotal = $('#' + $scope.mainTag + ' .dataTables_scrollBody')[0].scrollHeight;
                    $scope.scroll({data: data});
                  });
                }
              });
            };
            /********************************* create datatables ****************************/


            $scope.fillDataTable = function () {
              $scope.table = $('#' + $scope.tableId).on('processing.dt', function (e, settings, processing) {
                $("#dtProcessignIndicator").css('display', processing ? 'block' : 'none');
              }).DataTable(dataTableConfigObject);
              $scope.showDTLoader = false;
              $scope.showItbLoader();
              $('#container').css('display', 'block');
              $scope.table.columns.adjust().draw();
              var elem = null;
              $('[data-toggle="popover"]').popover({html:true}).on("mouseenter", function (e) {
                //e.stopPropagation();
                // $('popover').popover('destroy');
                //   if(e.toElement.cellIndex === 1) {
                var _this = this;
                var rowIndex = _this._DT_RowIndex;
                elem = this;
                $(this).popover("show");
                $('.popover').css({
                  "left": function(){
                    var pointerPosition = e.pageX;
                    if(pointerPosition> (screen.width/2)){
                      return pointerPosition-400; //(100 is basically the width of the tooltip + widht of the placeholder + 2 Px)
                    }
                    else {
                      return pointerPosition + 30;
                    }
                  },
                  "top": function(){ return e.pageY - 65;}
                });
                $scope.dtOptions.onHover.props.forEach(function (object, index) {
                  if (object.eventType) {
                    $("." + object.elemClass).off().on(object.eventType, function (e) {
                      object.callback(sharedDatasvc.getDtRowObject(), e);
                    })
                  }
                });
                // $(this).on("mouseleave", function (e) {
                //     if(!document.querySelectorAll('.popover:hover').length > 0)
                //         $(_this).popover('destroy');
                // });

                $('.popover').on('mouseleave', function (e) {

                  $('.popover').popover('destroy');
                });
                //   }
              }).on("mouseleave", function () {
                //   if(!this.isEqualNode(elem)) {
                var _this = this;
                if (!$(".popover:hover").length) {
                  $(_this).popover("destroy");
                }
                //    }
              });
              $('[data-toggle="tooltip"]').tooltip();

            };


            tableHtml = ($scope.dtOptions.onHover.isHover) ? '<tr>' : '<tr>';
            for (var index = 0; index < $scope.aoColumns.length; index++) {
              if ($scope.aoColumns[index].colTitle === "checkbox") {
                tableHtml += '<th class="table-checkbox"><div class="Checkbox-list colHead"><input type="checkbox" /><div class="Checkbox-visible-2"></div></div></th>';
                continue;
              }
              if ($scope.aoColumns[index].colTitle === "icons") {
                tableHtml += '<th class="table-checkbox icons"><div class="Checkbox-list colHead"></div></th>';
                continue;
              }
              tableHtml += '<th style="text-align:left">' + $scope.aoColumns[index].colTitle + '</th>';
            }
            if ($scope.dtOptions.actionButtons.displayColumn === true) {
              tableHtml += '<th style="text-align:left">' + "Actions" + '</th></tr>';
            }
            $("#" + $scope.tableId + " thead").append(tableHtml);
            $("#" + $scope.tableId + " tfoot").empty();
            $("#" + $scope.tableId + " tfoot").append(tableHtml);
            $("#" + $scope.tableId + " tfoot th").each(function (index) {
              var title = $(this).text();
              if (index === $scope.aoColumns.length || ($(this).find('input').length > 0 && $(this).find('input')[0].type === "checkbox") || $(this).hasClass('icons')) {
                $(this).html('<input  type="text" name="' + title + '" class="dtSearch' + index + ' hideIt form-control" placeholder="Search ' + title + '" />');
              }
              else if(title == "sync status" && $state.current.name == "app.masterdata") {
                $(this).html('<div class="dtSearch form-control search-box"/>');
              }
              else {
                $(this).html('<input class="dtSearch' + index + ' form-control search-box ' + $scope.aoColumns[index].searchFilter + '" type="text" name="' + title + '"  placeholder="&#xf002; Search" style="font-family: FontAwesome, Open Sans, sans-serif" />');
              }
            });
            $("#" + $scope.tableId + " tfoot tr").appendTo("#" + $scope.tableId + " thead");

            /**************************Changes By Farhan*********************************/
            if ($scope.dtOptions.saveStateName == 'documentSnapshot') {
              var total = sharedDatasvc.getDocSnapShotTotals();
              var myHtml = "<tr id='myrow'>";
              for (var i = 0; i < $scope.aoColumns.length; i++) {
                myHtml += '<th style="text-align:left"></th>';
              }
              myHtml += '</tr>';
              // $("#" + $scope.tableId + " tfoot").empty();
              $("#" + $scope.tableId + " thead").append(myHtml);
              $("#" + $scope.tableId + " thead #myrow th").each(function (index) {
                var obj = $scope.configObject[index].countName;
                if (total[obj] == "undefined" || miscUtils.isUndefined(total[obj])) {
                  total[obj] = 0;
                }
                $(this).html('<p style="margin-bottom: 0px;">' + total[obj] + '</p>');
              });
            }
            //total = sharedDatasvc.setDocSnapShotTotals(false);
            /**************************End of Changes By Farhan*********************************/

            /********************* Datatables Object ******************/

            var dataTableConfigObject = {
              "aaData": $scope.list,
              //"processing": true,
              //"pagingType": "full_numbers",
              sDom: 'ti',
              scrollX: $scope.dtOptions.scrollX,
              scrollY: $scope.dtOptions.scrollY,
              deferRender: true,
              //ordering: true,
              columnDefs: [
                {
                  orderData: [$scope.dtOptions.columnDefs.orderData],
                  targets: [$scope.dtOptions.columnDefs.targets]
                },
                {
                  visible: false,
                  targets: [$scope.dtOptions.hideColumn ? $scope.dtOptions.hideColumn : null]
                },
                {
                  targets: 1,
                  createdCell:  function (td, cellData, rowData, row, col) {
                    var tempStr = $scope.dtOptions.onHover.template;
                    $scope.dtOptions.onHover.props.forEach(function (object, index) {
                      if (object.name){
                        if(object.name === 'server'){
                          if(!rowData.server){
                            rowData.server="";
                            //tempStr = tempStr.replace("<button class=' btn-transparent copyUrl' data-toggle='tooltip' data-placement='top' title='Copy URL' ui-jq='tooltip'><img src='../assets/img/copy-paste.png'></button>","<br>");
                            tempStr=tempStr.replace("<div class='m-b-10'> <span class='pull-left'> Url: </span> <a id='copyUrl' href='//[server]' target='_blank' class='pull-left' style='overflow: hidden;text-overflow: ellipsis;max-width:15em;white-space: nowrap;'>&nbsp[server]</a><button class='btn-transparent copyUrl' data-toggle='tooltip' data-placement='top' title='Copy URL' ui-jq='tooltip'><img src='../assets/img/icon_copy.svg' width='22px'></button> </div>"," ")
                          }
                          var url = '';

                          var urlArray = (rowData.server) ? rowData.server.split(':') : rowData.server;
                          if(typeof urlArray === 'object' && urlArray.constructor === Array && urlArray.length > 1){
                            if(urlArray.length>2) {
                              urlArray = urlArray.splice(1);
                              urlArray = urlArray.join(':');
                              url = urlArray;
                            }else{
                              url = urlArray[1];
                            }
                          }else{
                            url = (typeof urlArray === 'object' && urlArray.constructor === Array) ? urlArray[0] : urlArray;
                          }
                          tempStr = tempStr.replace("[" + object.name + "]", url);
                        }
                        if(object.name != 'server') {
                          tempStr = tempStr.replace("[" + object.name + "]", rowData.userNamePassword);
                        }
                        if(object.name === 'server') {
                          tempStr = tempStr.replace("[" + object.name + "]", rowData.server);
                        }
                      }

                    });
                    if($scope.dtOptions.onHover.props.length>4){
                      if ($scope.dtOptions.onHover.isHover) {
                        $(td).attr({
                          "title": $scope.dtOptions.onHover.title + " <span class='bold'>" + rowData.passwordName + "</span>",
                          "data-toggle": "popover",
                          'data-container':"body",
                          "data-content": tempStr,
                          "data-placement": $scope.dtOptions.onHover["data-placement"],
                          "data-html": $scope.dtOptions.onHover["data-html"],
                          trigger: "hover",
                          "selector": '[rel=popover]'
                        });
                      }
                    }
                    var tempStr1 = $scope.dtOptions.onHover.template;
                    $scope.dtOptions.onHover.props.forEach(function (object, index) {
                      tempStr1 = rowData.ITBRunBookName;
                    });
                    if($scope.dtOptions.saveStateName == 'Knowledgebase') {
                      if ($scope.dtOptions.onHover.isHover) {
                        $('<span class="tooltip1" ><span class="tooltiptext1">'+tempStr1+'</span></span>').appendTo(td.childNodes[0]);
                      }
                    }
                  }
                }
              ],
              orderClasses: true,
              scroller: true,
              scrollerCollapse: true,
              //paging: true,
              bAutoWidth: true,
              bPaginate: true,
              //destroy: false,
              // bInfo: true,
              orderCellsTop: true,
              aaSorting: $scope.dtOptions.sortedColumn,
              colReorder: $scope.dtOptions.colReorder,
              stateSave: $scope.dtOptions.saveState,
              "aoColumns": $scope.aoColumns,
              fixedColumns: $scope.dtOptions.fixedColumns,
              'createdRow': function (row, rowObject, dataIndex) {
              },
              "rowCallback": function (row, data, index) {
                $scope.rowCallBack({
                  row: row,
                  data: data,
                  index: index
                });
              },
              "fnInfoCallback": function (oSettings, iStart, iEnd, iMax, iTotal, sPre) {
                scrollEnd = iEnd;
                scrollTotal = iTotal;
                return ($scope.dtOptions.changeInfoMessage)
                  ? 'Total no of records found: ' + iTotal
                  :(iTotal == 0)
                    ?'Showing ' + iTotal + ' to ' + iEnd + ' of ' + iTotal + ' entries'
                    :'Showing ' + iStart + ' to ' + iEnd + ' of ' + iTotal + ' entries';
              },
              "drawCallback": function (settings) {
                $timeout(function () {
                  $(".DTFC_Cloned tbody").off().on('click', 'button', $scope.actionCallback);
                }, 2000);
              }
            };



            /************************** Creating Datatable ************************ */
            configureDataTableObject();

            $scope.fillDataTable();
            $scope.hideLoader = true;
            $scope.scrollMethod();

            registerEventListener();
            /**************************                   Event listners                  ***************************/

            /********* register event for those columns which are not visible by default *********/
            function columnReorder () {
              $("#" + $scope.tableId).on('column-reorder.dt', function (e, settings, details) {
                setTimeout(function(){
                  saveColumnSettings();
                  registerEventListener();
                }, 1000);
              });
            }
            columnReorder();
            colVisFunc();
            function visibleColum () {
              $("#" + $scope.tableId).on('column-visibility.dt', function (e, settings, details) {
                setTimeout(function () {
                  saveColumnSettings();
                  registerEventListener();
                }, 1000);
              });
            }
            visibleColum();
            if (typeof $scope.dtOptions.buttons.name !== "undefined") {
              if ($scope.colvisBid === undefined) {
                $('#colVisBtn').empty();
                $scope.table.buttons().container()
                  .appendTo('#colVisBtn');
                $("#" + $scope.tableId).on('column-visibility.dt', function (e, settings, column, state) {
                  saveColumnSettings();
                  if (state === true) {
                    registerEventListener();
                  }
                });
                columnReorder();

                if ($scope.dtOptions.fixedColumns.leftColumns === 0 && $scope.dtOptions.fixedColumns.rightColumns === 0) {
                  $(".DTFC_RightWrapper").css("display", "none");
                }
                $("#colVisBtn").tooltip({title: "Select Columns", placement: "bottom"});
              } else {
                $('#' + $scope.colvisBid).empty();
                $scope.table.buttons().container()
                  .appendTo('#' + $scope.colvisBid);
                columnReorder();
                $("#" + $scope.tableId).on('column-reorder.dt', function (e, settings, details) {
                  setTimeout(function(){
                    saveColumnSettings();
                    registerEventListener();
                  }, 1000);
                })
                if ($scope.dtOptions.fixedColumns.leftColumns === 0 && $scope.dtOptions.fixedColumns.rightColumns === 0) {
                  $(".DTFC_RightWrapper").css("display", "none");
                }
                $("#" + $scope.colvisBid).tooltip({title: "Select Columns" , placement: "bottom"});


              }

            }
            $scope.table.columns.adjust().draw();
            $('.modal').on('shown.bs.modal', function () {
              if (!($scope.dtOptions.container === sharedDatasvc.ListContainer.PAGE || $scope.dtOptions.container === sharedDatasvc.ListContainer.WIDGET)) {
                $scope.table.columns.adjust().draw();
              }
            })

            $("body").on("click", function () {
              $(".DTFC_Cloned tbody").off().on('click', 'button', $scope.actionCallback);
            });
            var isSelectAll = false;
            $("body").on("click", "th input[type='checkbox']", function () {
              isSelectAll = $(this)[0].checked;
              var rowList = $scope.table.rows({'search': 'applied'});
              var rows = rowList.nodes();
              $('input[type="checkbox"]', rows).prop('checked', isSelectAll);
              if (rowList[0].length > 0 && rowList[0].length < $scope.list.length && isSelectAll) {
                $scope.openLink(rowList[0], null, null, null);
              }
              else {
                $scope.openLink(isSelectAll, null, null, null);
              }
            });
            $(".DTFC_Cloned tbody").on('click', 'button', $scope.actionCallback);
            $("#" + $scope.tableId + " tbody").on('click', 'td', function (event) {
              event.preventDefault();
              if (event.target.tagName === 'INPUT' && event.target.type === 'checkbox') {
                var currentCheckBoxVal = $(this)[0].firstElementChild.children[0].checked;
                //$(this).parent('tr').toggleClass('selected');
                if (currentCheckBoxVal) {
                  $(this).find('input').replaceWith('<input type="checkbox" checked>');
                } else {
                  $(this).find('input').replaceWith('<input type="checkbox">');
                  $("thead input[type='checkbox']").attr('checked', false);
                }

                //$(this)[0].firstElementChild.checked = (currentCheckBoxVal === true) ? true : false;
                var colName = $($scope.table.column($scope.table.cell(this).index().column).header()).html();
                var object = $scope.table.row($(this).parents('tr')).data();
                $scope.openLink(null, colName, object, currentCheckBoxVal);
              }
              //Added By Awais 16-5-2017
              else if (event.target.id === 'searchTagslist') {

              }
              else if (($state.current.name == "app.domainTracker.list") && (event.target.id === 'delete')) {

              }
              else if (event.target.tagName == 'A' && event.target.target == '_blank') {// _blank to check if its external link or inner state
                var colName = $($scope.table.column($scope.table.cell(this).index().column).header()).html();
                var object = $scope.table.row($(this).parents('tr')).data();
                $scope.openLink(null, colName, object, currentCheckBoxVal);
              }
              else if (event.target.tagName !== 'TD' && event.target.tagName !== 'I' && event.target.tagName !== undefined) {
                if (event.target.tagName !== 'BUTTON') {
                  var className = this.className.substr(0, this.className.indexOf(' '));
                  if (className !== 'editBtnX' && className !== 'locationBtnX' && className !== 'deleteBtnX' && className !== 'searchBtnX' && className !== 'userInviteBtnX' && className !== 'startSyncingBtnX' && className !== 'toggleSyncingBtnX' && className !== 'printBtnX' && className !== 'changePaswordBtnX' && className !== 'updateFromListBtnX') {
                    event.preventDefault();
                    var colName = $($scope.table.column($scope.table.cell(this).index().column).header()).html();
                    var object = $scope.table.row($(this).parents('tr')).data();
                    object.colName = colName;
                    object.cellValue = event.currentTarget.innerText;
                    for (var i = 0; i < $scope.configObject.length; i++) {
                      if ($scope.configObject[i].colName === colName && $scope.configObject[i].eventType === "hrefState") {
                        if ($scope.configObject[i].templateUUID) {
                          object.templateUUID = $scope.configObject[i].templateUUID;
                        }
                        sharedDatasvc.setCurrentItem(object);
                        $scope.viewData();
                      }
                    }
                  }
                }

              }
            });
          });

          function colVisFunc() {
            if ($scope.dtOptions.saveState === true) {
              var newA;
              var columnConfigurationObject1 = JSON.parse($scope.columnConfigurationObject);
              var table1 = $("#" + $scope.tableId).DataTable();
              var conter = 0
              for (var nmber in columnConfigurationObject1.columns) {
                if (table1.column(nmber).visible() === false) {
                  conter++
                }
              }
              if ($scope.dtOptions.actionButtons.displayColumn === false) {
                newA = columnConfigurationObject1.columns.length
              }

              else {
                newA = columnConfigurationObject1.columns.length - 2
              }

              if (newA == conter) {
                $scope.noVisibility = true;

                $('.dataTables_wrapper').css('visibility','hidden');

              }

              else {
                $scope.noVisibility = false;

                $('.dataTables_wrapper').css('visibility','visible');

              }
            }
          }
          function saveColumnSettings() {
            if ($scope.dtOptions.saveState === true) {
              colVisFunc();
              var user = sharedDatasvc.getUser();
              if ($state.current.name != "app.customTemplatesData.list") {
                if ($scope.dtOptions.saveStateName && $scope.dtOptions.saveStateName != null && $scope.dtOptions.saveStateName != "") {
                  var settingsObject = {
                    name: $scope.dtOptions.saveStateName,
                    dataTableSettings: $scope.columnConfigurationObject
                  };
                }
                else {
                  var settingsObject = {
                    name: $state.current.name,
                    dataTableSettings: $scope.columnConfigurationObject
                  };
                }
              } else {
                var settingsObject = {
                  name: user.temp01.ITBTemplateName,
                  dataTableSettings: $scope.columnConfigurationObject
                };
              }
              if ($state.current.name != "access.login") {
                globalsvc.GetData("users/saveUserListSettings/" + user.userId, "POST", settingsObject).then(function (dataTableSettings) {
                  user.userListSettings = [];
                  user.userListSettings = dataTableSettings.data;
                  sharedDatasvc.setUser(user);
                });
              }
            }
          };

        }],
        link: function (scope, element, attrs, ctrl) {
          scope.$watchCollection("list", function (newArray) {
            if (scope.table && scope.changeList) {
              scope.list = newArray;
              scope.table.clear().draw();
              scope.table.rows.add(newArray).draw();
              scope.table.fixedColumns().update();
              $(".DTFC_Cloned tbody").on('click', 'button', scope.actionCallback)
            }
          });
          scope.addRowWithOutDrawTable = function (data, isBulk) {
            if (isBulk) {
              scope.table.rows.add(data).draw(false);
            } else {
              scope.table.row.add(data).draw(false);
            }
          };
          scope.addData({addRow: scope.addRowWithOutDrawTable});
          scope.multipleRowsDelete = function (data) {
            for (var i = 0; i < data.length; i++) {
              for (var j = 0; j < scope.table.rows().count(); j++) {
                if ((data[i]._id && data[i]._id == scope.table.row(j).data()._id) || (data[i].id && data[i].id == scope.table.row(j).data().id)) {
                  scope.table.rows(j).remove().draw(false);
                }
              }
            }
          };
          scope.bulkDelete({deleteSelectedRows: scope.multipleRowsDelete});
        }
      }
    }]);