<!-- add feed form -->
<div class="col-xs-12 col-sm-8 col-md-9 col-lg-9">
  <div class="add-feed" ng-controller="addFeedCtrl">
    <h4>Add Feed</h4>
    <form class="inline-form" name="addFeed" role="form" novalidate>
      <div class="form-group">
        <input type="url" class="required form-control" name="url" placeholder="Enter URL..." ng-model="url" autofocus="autofocus" required />
      </div>
      <button class="btn btn-primary" ng-click="add(url)" ng-disabled="addFeed.$invalid || adding">
      <span class="icon-plus" alt="Add Feed"></span> Add Feed</button>
    </form>
  </div>
</div>