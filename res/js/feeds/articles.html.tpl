<div ng-switch on="view" ng-controller="feedCtrl">

<div ng-switch-when="article">

  <div ng-show="!article.link">
    <p>loading article...</p>
  </div>

  <div ng-show="article.link">
    <div id="article{{ article.link | md5 }}" role="dialog" aria-labelledby="articleLabel{{ article.link | md5 }}" aria-hidden="true"  >

      <div class="nav article-nav">
        <ul>
          <li class="btn btn-default" ng-click="viewArticle(filteredItems[$index -1], a)">Previous</li>
          <li class="btn btn-default" ng-click="viewArticle(filteredItems[$index +1], a)">Next</li>
          <li class="btn btn-default" ng-click="toggleRead(a, true)">List</li>
        </ul>
      </div>

      <div class="article"
           ng-swipe-left="viewArticle(filteredItems[$index -1], a)"
           ng-swpe-right="viewArticle(filteredItems[$index +1], a)">
        <h2>{{ article.title }}</h2>
        <div class="article-body" data-ng-bind-html="article.brief_html"></div>
        <div ng-repeat="m in article.media"
             class="article-audio">
          <audio controls ng-src="{{ m.url }}" type="{{ m.type }}">
            Your browser does not s``port the audio element.
          </audio>
        </div>
      </div>

      <div class="nav article-nav">
        <ul>
          <li class="btn btn-default" data-dismiss="modal" ng-click="viewArticle(filteredItems[$index -1], a)">Previous</li>
          <li class="btn btn-default" data-dismiss="modal" ng-click="viewArticle(filteredItems[$index +1], a)">Next</li>
          <li class="btn btn-default" data-dismiss="modal" ng-click="toggleRead(a, true)">List</li>
        </ul>
      </div>

    </div>
  </div>
</div>

<div ng-switch-when="list">

  <div class="col-xs-12 articles-feed-info" ng-show="feeds.current.name">
    <span class="feed-name">{{ feeds.current.name }}</span>
    <span class="feed-edit" ng-click="showFeedSettings(feeds.current.id)">edit</span>
    <div class="articles-loading" ng-show="!articlesShown">
      <p>loading articles...</p>
    </div>
  </div>

  <div class="col-xs-12 articles-empty" ng-show="feeds.articles.length > 0 && currentIsEmpty()">
    <p>no articles</p>
  </div>

  <div ng-repeat="a in (filteredItems = ( feeds.articles | orderBy: 'object.date':true  | filter: isShowable )) track by $index"
       title="{{ a.title }}"
       ng-class="{read: a.read, article: true}">
    <div class="mark-unread" ng-show="a.read" ng-click="toggleRead(a, $index)">Mark Unread</div>
    <div class="mark-read" ng-show="!a.read" ng-click="toggleRead(a, $index)">Mark Read</div>
    <div class="article-content">
      <div class="article-title" ng-click="viewArticle(a)">
        <h2>{{ a.title }}</h2>
        <span class="article-view-icon glyphicon"
              ng-class="{'glyphicon-chevron-right': (!a.read)}"></span>
      </div>

      <div class="article-info">
        <div class="col-xs-6 col-sm-4"><p><i>{{ feeds.current.name }}</i></p></div>
        <div class="col-xs-6 col-sm-4"><p rel="{{ a.date }}"><i>{{ a.date | fromNow}}</i></p></div>
        <div class="col-xs-12"><a class="btn btn-default button-article-link" target="_blank" href="{{ a.link }}"><span style="font-size: 1.1em; font-weight: bold; margin-right: 10px;">visit article link</span> <span class="glyphicon glyphicon-new-window"></span></a></div>
      </div>
    </div>
  </div>

  <div ng-show="feeds.articles.length > 0" class="col-xs-12">
    <div class="btn btn-default button-show-more" ng-click="showMore()">Show More</div>
  </div>
</div>
</div>
