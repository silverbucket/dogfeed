<div ng-switch on="view" ng-controller="feedCtrl">

<div ng-switch-when="article">

  <div ng-show="!article.link">
    <p>loading article...</p>
  </div>

  <div ng-show="article.link">
    <div id="article{{ article.link | md5 }}" role="dialog" aria-labelledby="articleLabel{{ article.link | md5 }}" aria-hidden="true"  >

      <div class="nav article-nav">
        <ul>
          <li class="btn btn-default" data-dismiss="modal" ng-click="viewArticle(article, 'prev')">Previous</li>
          <li class="btn btn-default" data-dismiss="modal" ng-click="viewArticle(article, 'next')">Next</li>
          <li class="btn btn-default" data-dismiss="modal" ng-click="switchFeed(article.source_link)">List</li>
        </ul>
      </div>

      <div class="article"
           ng-swipe-left="viewArticle(article, 'prev')"
           ng-swpe-right="viewArticle(article, 'next')">
        <h2>{{ article.title }}</h2>
        <div class="article-body" data-ng-bind-html="article.brief_html"></div>
        <div ng-repeat="m in article.media"
             class="article-audio">
          <audio controls ng-src="{{ m.url }}" type="{{ m.type }}">
            Your browser does not s``port the audio element.
          </audio>
        </div>
      </div>

      <div class="col-xs-12" style="margin: 10px 0 10px 0;">
        <a class="btn btn-default button-article-link" target="_blank" href="{{ article.link | decode }}">
          <span style="font-size: 1.1em; font-weight: bold; margin-right: 10px;">visit article link</span> 
          <span class="glyphicon glyphicon-new-window"></span>
        </a>
      </div>

      <div class="nav article-nav">
        <ul>
          <li class="btn btn-default" data-dismiss="modal" ng-click="viewArticle(article, 'prev')">Previous</li>
          <li class="btn btn-default" data-dismiss="modal" ng-click="viewArticle(article, 'next')">Next</li>
          <li class="btn btn-default" data-dismiss="modal" ng-click="switchFeed(article.source_link)">List</li>
        </ul>
      </div>

    </div>
  </div>
</div>

<div ng-switch-when="list">

  <div class="col-xs-12 articles-feed-info" ng-show="feeds.current.name">
    <span class="feed-name">{{ feeds.current.name }}</span>
    <span class="feed-edit" ng-click="showFeedSettings(feeds.current.id)">edit</span>

    
  </div>

  <div class="col-xs-12 articles-loading" ng-show="!articlesShown">
    <p>loading articles...</p>
  </div>

  <div class="col-xs-12 articles-empty" ng-show="feeds.articles.length > 0 && currentIsEmpty()">
    <p>no articles</p>
  </div>

  <div ng-repeat="a in (filteredItems = ( feeds.articles | orderBy: 'date':true  | filter: isShowable )) track by $index"
       title="{{ a.title }}"
       ng-class="{read: a.read, article: true}">
    <div class="mark-unread" ng-show="a.read" ng-click="toggleRead(a)">Mark Unread</div>
    <div class="mark-read" ng-show="!a.read" ng-click="toggleRead(a)">Mark Read</div>

    <div class="col-xs-12 article-list-content"
         ng-click="viewArticle(a)">

      <h2>{{ a.title }}</h2>

      <span class="article-view-icon glyphicon"
            ng-class="{'glyphicon-chevron-right': (!a.read), 'glyphicon-minus': (a.read)}"></span>

      <span rel="{{ a.date }}"><i>{{ a.date | fromNow}}</i></span>
    </div>
  </div>

  <div ng-show="feeds.articles.length > 0" class="col-xs-12">
    <div class="button-loading" ng-show="!feeds.info[feeds.current.id].loaded">
      <div id="facebookG">
        <div id="blockG_1" class="facebook_blockG">
        </div>
        <div id="blockG_2" class="facebook_blockG">
        </div>
        <div id="blockG_3" class="facebook_blockG">
        </div>
      </div>
    </div>

    <div class="btn btn-default button-show-more" data-style="contract" ng-click="showMore()" ng-disabled="!feeds.info[feeds.current.id].loaded">
      <span>Show More</span>
    </div>

  </div>
</div>
</div>
