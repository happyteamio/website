$(document).ready(function(){
	        var $root = $('html, body');
            $('a').click(function(e) {
                e.preventDefault();

                var href = $.attr(this, 'href');
                var offset = 0;
                if(href !== "#") {
                    offset = $('a[name^="' + href.substring(1) + '"]').offset().top 
                }
                $root.stop(true,true).animate({
                    scrollTop: offset
                }, 500, function () {
                    window.location.hash = href;
                });
                return false;
            });
        });

