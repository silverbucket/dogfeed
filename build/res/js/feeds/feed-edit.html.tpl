<!-- feed -->
<div ng-controller="feedSettingsCtrl" class="edit-feed">
  <h4 class="modal-title">Feed settings!</h4>
  <form class="form-horizontal" name="feedSettings" role="form" novalidate>
    <fieldset>
      <div class="form-group">
        <label for="feedUrl" class="col-sm-2 control-label">URL</label>
        <div class="col-sm-8">
          <input type="text" class="form-control" name="feedUrl" ng-model="feeds.edit.url">
        </div>
      </div>
      <div class="form-group">
        <label for="displayname" class="col-sm-2 control-label">Display Name</label>
        <div class="col-sm-8">
          <input type="text" class="required form-control" name="displayname" placeholder="Enter display name..." ng-model="feeds.edit.name">
        </div>
      </div>
      <div class="control-group">
        <div class="col-sm-2">
        </div>

        <div class="col-sm-4">
          <button type="default" ng-click="saveFeedSettings(feeds.edit)" class="btn btn-primary btn-spacing" ng-disabled="saving">Save</button>
        </div>

        <div class="col-sm-2">
          <button ng-click="cancelFeedSettings()" class="btn btn-action btn-cancel btn-spacing" ng-disabled="saving">Cancel</button>
        </div>
        <div class="col-sm-2">
          <button style="float: left;" ng-click="deleteFeed(feeds.edit)" ng-disabled="saving" class="btn btn-danger btn-spacing">Delete</button>
        </div>
      </div>
    </fieldset>
  </form>
</div>
