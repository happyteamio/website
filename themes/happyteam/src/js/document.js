$(document).ready(function(){
	        var $root = $('html, body');
            $('.nav .drop a').click(function(e) {
                var href = $.attr(this, 'href');
                var offset = 0;

                if(href && href.indexOf("#") > -1) {
                    var hashName = href.substr(href.indexOf("#") + 1);
                    var anchorSelector = $('a[name^="' + hashName + '"]');
                    if(anchorSelector.length) {
                        e.preventDefault();

                        offset = anchorSelector.offset().top;
                        $root.stop(true,true).animate({
                            scrollTop: offset
                        }, 400, function () {
                            window.location.hash = hashName;
                        });
                    }
                }
            });

            $.cookiesDirective({
                privacyPolicyUri: '/privacy-policy/',
                position: 'bottom'
            });
        });

