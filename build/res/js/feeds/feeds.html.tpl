<!-- feeds -->
<section class="page">
  <div class="container">
    <div class="row" ng-controller="feedCtrl">

      <div class="col-md-3">
        <div class="feed-controls">
          <form name="quickSettings" class="form-horizontal" novalidate>
              <label for="showRead" style="width: 125px; margin-right: 5px;"
                     class="control-label">Show Read Articles</label>
              <input type="checkbox" name="showRead" ng-model="model.settings.showRead" />
          </form>
        </div>
        <feed-list class="feeds" feeds="feeds" settings="model.settings">Feeds</feed-list>
      </div>

      <div class="col-md-9 article-text" ng-show="(feeds.articles.length == 0) && (feeds.infoArray.length > 0)"><p>loading articles...</p><img src="res/img/loading.gif" /></div>

      <articles class="col-md-8 articles" feeds="feeds" settings="model.settings">
      </articles>
    </div>
  </div>
</section>
