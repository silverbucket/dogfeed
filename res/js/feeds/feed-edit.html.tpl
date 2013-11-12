<!-- feed ` -->
<div ng-controller="feedSettingsCtrl" class="edit-feed">
  <h4 class="modal-title">Feed settings</h4>
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
        <div class="col-sm-10">
          <button type="default" ng-click="saveFeedSettings(feeds.edit)" class="btn btn-primary" ng-disabled="saving">Save</button>
          <button ng-click="cancelFeedSettings()" class="btn btn-action btn-cancel" ng-disabled="saving">Cancel</button>
          <button style="float: left;" ng-click="deleteFeed(feeds.edit)" ng-disabled="saving" class="btn btn-danger">Delete</button>
          </div>
        </div>
      </div>
    </fieldset>
  </form>
</div>
