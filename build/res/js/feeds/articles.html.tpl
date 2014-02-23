<div class="row">
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

  
  <div ng-repeat="a in (filteredItems = ( feeds.articles | orderBy: 'object.date':true  | filter:isShowable ))"
       title="{{ a.object.title }}"
       ng-class="{read: a.object.read, article: true}"
       ng-controller="feedCtrl">
    <div class="mark-unread" ng-show="a.object.read" ng-click="toggleRead(a, $index)">Mark Unread</div>
    <div class="mark-read" ng-show="!a.object.read" ng-click="toggleRead(a, $index)">Mark Read</div>
    <div class="article-content">
      <div class="article-title" ng-click="viewArticle(a.object.link)">
        <h2>{{ a.object.title }}</h2>
        <span class="article-view-icon glyphicon"
              ng-class="{'glyphicon-chevron-right': (!a.object.read)}"></span>
      </div>

      <div class="article-info">
        <div class="col-xs-6 col-sm-4"><p><i>{{ feeds.info[a.actor.address].name }}</i></p></div>
        <div class="col-xs-6 col-sm-4"><p rel="{{ a.object.date }}"><i>{{ a.object.date | fromNow}}</i></p></div>
        <div class="col-xs-12"><a class="btn btn-default button-article-link" target="_blank" href="{{ a.object.link }}"><span style="font-size: 1.1em; font-weight: bold; margin-right: 10px;">visit article link</span> <span class="glyphicon glyphicon-new-window"></span></a></div>
      </div>
    </div>

    <div id="article{{ a.object.link | md5 }}" class="article-modal modal fade" role="dialog" aria-labelledby="articleLabel{{ a.object.link | md5 }}" aria-hidden="true"  >
      <div class="modal-dialog">
        
        <div class="modal-content">
          <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
            <div class="article-nav col-xs-12">
              <ul>
                <li class="btn btn-default" data-dismiss="modal" ng-click="viewArticle(filteredItems[$index -1].object.link, a)">Previous</li>
                <li class="btn btn-default" data-dismiss="modal" ng-click="toggleRead(a, true)">List</li>
                <li class="btn btn-default" data-dismiss="modal" ng-click="viewArticle(filteredItems[$index +1].object.link, a)">Next</li>
              </ul>
            </div>
          </div>
          <div class="modal-body"
               data-dismiss="modal" 
               ng-swipe-left="viewArticle(filteredItems[$index -1].object.link, a)"
               ng-swpe-right="viewArticle(filteredItems[$index +1].object.link, a)">
            <h2>{{ a.object.title }}</h2>
            <div class="article-body" data-ng-bind-html="a.object.brief_html"></div>
            <div ng-repeat="m in a.object.media"
                 class="article-audio">
              <audio controls ng-src="{{ m.url }}" type="{{ m.type }}">
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
          <div class="modal-footer">
            <div class="article-nav col-xs-12">
              <div class="col-xs-4 btn btn-default" data-dismiss="modal" ng-click="viewArticle(filteredItems[$index -1].object.link, a)">Previous</div>
              <div class="col-xs-4 btn btn-default" data-dismiss="modal" ng-click="toggleRead(a, true)">List</div>
              <div class="col-xs-4 btn btn-default" data-dismiss="modal" ng-click="viewArticle(filteredItems[$index +1].object.link, a)">Next</div>
            </div>
          </div>
        
        </div>
      </div>
    </div>
  </div>
  <div ng-show="feeds.articles.length > 0" class="col-xs-12">
    <div class="btn btn-default button-show-more" ng-click="showMore()">Show More</div>
  </div>
</div>