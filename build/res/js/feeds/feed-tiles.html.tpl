<div class="row">
  <div class="col-6 col-sm-6 col-lg-4" ng-show="feeds.infoArray.length == 0">
    <p>no feeds yet, add some!</p>
  </div><!--/span-->

  <div ng-repeat="f in feeds.infoArray | orderBy: 'name'"
       class="col-xs-6 col-sm-4 col-md-2 col-lg-2 feed-tile"
       title="{{ f.url }}"
       style="background: url({{(f.image) ? f.image : '/res/img/rss.svg'}}) no-repeat center center;"
       ng-click="switchFeed(f.url, null, f.error)"
       ng-class="{active: isSelected(f.url), error: f.error, 'feed-tile-even': !f.image && ($index % 2), 'feed-tile-odd': !f.image && (!$index % 2)}">
    <div class="feed-tile-loading" ng-show="f.loaded != true">
      <div id="facebookG">
        <div id="blockG_1" class="facebook_blockG">
        </div>
        <div id="blockG_2" class="facebook_blockG">
        </div>
        <div id="blockG_3" class="facebook_blockG">
        </div>
      </div>
    </div>
    <div class="feed-tile-count">
      <span class="unread-count rounded" ng-bind="f.unread"></span>
    </div>

    <div class="feed-tile-info">
      <span class="feed-title-text" ng-bind="f.name"></span>
    </div>
  </div><!--/span-->

</div><!--/row-->
