$(document).ready(function(){
	        var $root = $('html, body');
            $('a').click(function() {
                var href = $.attr(this, 'href');
                var offset = 0;
                if(href !== "#") {
                    offset = $('a[name^="' + href.substring(1) + '"]').offset().top - $("#header").height() 
                }
                $root.animate({
                    scrollTop: offset
                }, 500, function () {
                    window.location.hash = href;
                });
                return false;
            });
        });

