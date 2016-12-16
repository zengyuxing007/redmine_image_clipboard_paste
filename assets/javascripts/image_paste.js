jQuery.event.props.push('clipboardData');

function pasteImageName(e, name) {
    var text = null;
    jsToolBar.prototype.elements.img.fn.wiki.call({
        encloseSelection: function(prefix, suffix, fn) {
            text = prefix + name + suffix;
        }
    })
    window.imgpaste.context.insertHtmlForTextarea(text);
}

/**
* Some browser doesn't support cliboardData.items, so this function recreates a simpler version of it
* by getting the blob linked to the image.
* Currently only works when copying an image from a webpage
*/
function getDataItems(clipboardData, editElement, event) {
    clipboardData.items = [];
    for(var i = 0; i < clipboardData.types.length; i++) {
        console.log(clipboardData.types[i]);
        var data = clipboardData.getData(clipboardData.types[i]);
        if(clipboardData.types[i] == "text/html") {
            var nodes = $(data);
            for(var j = 0; j < nodes.length; j++) {
                var item = {};
                var node = nodes[j];
                if(node.tagName == 'IMG') {
                    var xhr = new XMLHttpRequest();
                    xhr.addEventListener('load', function(){
                        if (xhr.status == 200){
                            //Do something with xhr.response (not responseText), which should be a Blob
                            item.getAsFile = function() {
                                return xhr.response;
                            }
                            item.type = xhr.response.type;
                            clipboardData.items.push(item);
                            processClipboardItems(clipboardData, editElement, event);
                        }
                    });
                    xhr.open('GET', node.src);
                    xhr.responseType = 'blob';
                    xhr.send(null);
                }
            }
        }
        else if(clipboardData.types[i] == "text/plain") {
            var file_regexp = /file:\/\/.*/;
            var regexp = new RegExp(file_regexp);
            if(data.match(regexp)) {
                alert('Your browser does not support pasting images from disk. Please use the upload form.');
            }

        }
    }
}

function uploadImage(type, blob, editElement) {
    /* Get file name and type details */
    var ext = '';
    switch (type)
    {
        case 'image/gif':
            ext = '.gif';
            break;
        case 'image/jpeg':
        case 'image/jpg':
        case 'image/pjpeg':
            ext = '.jpg';
            break;
        case 'image/png':
            ext = '.png';
            break;
        case 'image/svg+xml':
        case 'image/svg':
            ext = '.svg';
            break;
        case 'image/tiff':
        case 'image/tif':
            ext = '.tiff';
            break;
        case 'image/bmp':
        case'image/x-bmp':
        case 'image/x-ms-bmp':
            ext = '.bmp';
            break;
    }
    var fileinput = $('.file_selector').get(0);
    var timestamp = Math.round(+new Date()/1000);
    var name = 'screenshot_'+addFile.nextAttachmentId+'_'+timestamp+ext;

    /* Upload pasted image */
    if (Object.defineProperty) {
        Object.defineProperty(blob, 'name', { value: name });
    } else {
        blob.name = name;
    }
    blob = $.extend(blob, {name: name});
    uploadAndAttachFiles([blob], fileinput);

    /* Inset text into input */
    pasteImageName(editElement, name);
}

function processClipboardItems(clipboardData, editElement, event) {
    for (var file = 0; file<clipboardData.items.length; file++)
    {
        if (clipboardData.items[file].type.indexOf('image/') != -1)
        {
            uploadImage(clipboardData.items[file].type, clipboardData.items[file].getAsFile(), editElement);
            event.preventDefault();
            event.stopPropagation();
            break;
        }

    }
}

$( document ).ready(function() {
    $('.wiki-edit').each(function(){
        this.addEventListener('drop', function (e) {
            for (var file = 0; file<e.dataTransfer.files.length; file++)
            {
                if (e.dataTransfer.files[file].type.indexOf('image/') != -1)
                {
                    var timestamp = Math.round(+new Date()/1000);
                    var name = 'screenshot_'+addFile.nextAttachmentId+'_'+timestamp+'_'+e.dataTransfer.files[file].name.replace(/[ !"#%&\'()*:<=>?\[\\\]|]/g, '_');
                    var blob = e.dataTransfer.files[file].slice();
                    if (Object.defineProperty) {
                        Object.defineProperty(blob, 'name', { value: name });
                    } else {
                        blob.name = name;
                    }

                    uploadAndAttachFiles([blob], $('input:file.file_selector'));
                    pasteImageName(this, name);

                    e.preventDefault();
                    e.stopPropagation();
                    break;
                }
            }
        });
    });

    uploadBlob = function (blob, uploadUrl, attachmentId, options) {
        var actualOptions = $.extend({
            loadstartEventHandler: $.noop,
            progressEventHandler: $.noop
        }, options);

        uploadUrl = uploadUrl + '?attachment_id=' + attachmentId;
        if (blob instanceof window.File || blob.name) {
            uploadUrl += '&filename=' + encodeURIComponent(blob.name);
        }

        return $.ajax(uploadUrl, {
            type: 'POST',
            contentType: 'application/octet-stream',
            beforeSend: function(jqXhr) {
                jqXhr.setRequestHeader('Accept', 'application/js');
            },
            xhr: function() {
                var xhr = $.ajaxSettings.xhr();
                xhr.upload.onloadstart = actualOptions.loadstartEventHandler;
                xhr.upload.onprogress = actualOptions.progressEventHandler;
                return xhr;
            },
            data: blob,
            cache: false,
            processData: false
        });
    }

    if ( !window.imgpaste ) window.imgpaste = {};

    window.imgpaste.context = {
        init: function () {
            this.initClipboardEvents();
        },

        isBrowserSupported: function () {
            var M = navigator.userAgent.match(/(firefox|webkit)\/?\s*(\.?\d+(\.\d+)*)/i);
            if (M) {
                var browserMajor = parseInt(M[2], 10);
                M[1] = M[1].toLowerCase();

                var isCompatChrome = (M[1] == 'webkit' && typeof window.chrome === "object" && browserMajor >= 535);
                hasClipboard = isCompatChrome;

                if (isCompatChrome ||
                    (M[1] == 'firefox' && browserMajor >= 3))
                    return true;
            }
            return false;
        },

        showSupportedBrowsers: function () {
            alert("Please use latest Firefox or Chrome to paste images from clipboard.");
        },

        /**
         * Inits the clipboard evetns for editors on the page.
         */
        initClipboardEvents: function(){
            var self = this;

            // - creates a capture to insert images from clipboards

            // fake editable content
            this.createPasteCapture();

            // focuses on the fake editable content when ctrl+v is pressed
            this.preventPaste = function() {
                if (!document.activeElement) return;

                // we can insert images only into wp editor
                if ( !$(document.activeElement).is(".wiki-edit") ) return;

                self.saveCurrentSelection();
                $("#paster").css('top', window.scrollY + 20).focus();
            }

            var vKey = 86;

            $(document).keydown(function(e){
                if ( (e.ctrlKey || e.metaKey) && e.keyCode == vKey ) {
                    if ( !self.isBrowserSupported() ) {
                        return;
                    }
                    self.preventPaste();
                };
            });

            // catchs the "paste" event to upload image on a server

            document.onpaste = function (e) {

                if (!document.activeElement) return;

                // we can insert images only into wp editor or editable content
                if (
                    !$(document.activeElement).is(".wiki-edit") &&
                    !$(document.activeElement).attr('contenteditable') ) return;

                var options = {
                    before: function() {
                    },
                    success: function(html) {
                        self.insertHtmlForTextarea(html);
                    },
                    error: function() {
                    }
                };

                if ( e.clipboardData && e.clipboardData.items)  {
                    self.uploadFromClipboard(e, options);
                } else {
                    if (self.isBrowserSupported()) {
                        self.uploadFromCapture(options);
                    } else {
                        getDataItems(e.clipboardData, self.selection.editor, e)
                    }
                }
            };
        },

        // --------------------------------------------------------------------------
        // Methods for uploading
        // --------------------------------------------------------------------------

        /**
         * Uploads image by using Clipbord API.
         */
        uploadFromClipboard: function(e, options) {
            var self = this;

            // if the image is inserted into the textarea, then return focus
            self.returnFocusForTextArea();
            var items = $.makeArray(e.clipboardData.items).concat($.makeArray(e.clipboardData.files));

            // read data from the clipboard and upload the first file
            for (var i = 0; i < items.length; ++i) {
                if ((!items[i].kind || items[i].kind === 'file') && items[i].type.indexOf('image/') !== -1) {

                    if ( options.before ) options.before();

                    // only paste 1 image at a time
                    e.preventDefault();

                    // uploads image on a server
                    this.uploadImage({
                        image: items[i].getAsFile ? items[i].getAsFile() : items[i],
                        type: items[i].type,
                        ref: 'clipboard'
                    }, options);

                    return;
                }
            }
            var items = e.clipboardData.items;
            for (var i = 0; i < items.length; i++) {
                if (items[i].kind === 'string' && items[i].type === 'text/plain') {
                    items[i].getAsString($.proxy(this.insertHtmlForTextarea, this));

                    e.preventDefault();

                    return;
                }
            }
        },

        b64toBlob: function(b64Data, contentType, sliceSize) {
            contentType = contentType || '';
            sliceSize = sliceSize || 512;

            var byteCharacters = atob(b64Data);
            var byteArrays = [];

            for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                var slice = byteCharacters.slice(offset, offset + sliceSize);

                var byteNumbers = new Array(slice.length);
                for (var i = 0; i < slice.length; i++) {
                    byteNumbers[i] = slice.charCodeAt(i);
                }

                var byteArray = new Uint8Array(byteNumbers);

                byteArrays.push(byteArray);
            }

            var blob = new Blob(byteArrays, {type: contentType});
            return blob;
        },


        /**
         * Uploads image by using the capture.
         */
        uploadFromCapture: function(options) {
            var self = this;

            if ( options.before ) options.before();

            var timeout = 5000, step = 100;
            $("#paster").html("");

            var timer = setInterval(function(){

                var html = $("#paster").html();

                // in nothing found, carry on to wait
                if ( html.length > 0 ) {
                    clearInterval(timer);

                    if ( html.indexOf("<img") == 0 ) {
                        var src = $("#paster img").attr('src');
                        var type = src.substring(src.indexOf(":") + 1, src.indexOf(";"))
                        var base64str = src.substr(src.indexOf(",") + 1);
                        self.uploadImage({
                            image: self.b64toBlob(base64str, type),
                            type: type,
                            ref: 'dragdrop'
                        }, options);

                    } else {
                        function getInnerText(el) {
                            var sel, range, innerText = "";
                            if (typeof document.selection != "undefined" && typeof document.body.createTextRange != "undefined") {
                                range = document.body.createTextRange();
                                range.moveToElementText(el);
                                innerText = range.text;
                            } else if (typeof window.getSelection != "undefined" && typeof document.createRange != "undefined") {
                                sel = window.getSelection();
                                sel.selectAllChildren(el);
                                innerText = "" + sel;
                                sel.removeAllRanges();
                            }
                            return innerText;
                        }
                        self.insertHtmlForTextarea(getInnerText($("#paster")[0]));
                    }

                } else {

                    timeout = timeout - step;
                    if ( timeout < 0 ) {
                        clearInterval(timer);
                    }
                    return;
                }

            }, 100);

            setTimeout(function(){
                self.returnFocusForTextArea();
            }, 500);
        },

        /**
         * Uploads image data on the server.
         */
        uploadImage: function(data, options) {
            uploadImage(data.type, data.image, this.selection.editor);
        },

        /**
         * Creates the capture.
         */
        createPasteCapture: function() {
            this.paster = $("<div id='paster'></div>").attr({
                "contenteditable": "true",
                "_moz_resizing": "false"
            }).css({
                "position": "absolute",
                "height": "1",
                "width": "1",
                "opacity": "0",
                "outline": "0",
                "overflow": "auto",
                "z-index": "-9999"})
                .prependTo("body");
        },

        // --------------------------------------------------------------------------
        // Methods for working with textarea
        // --------------------------------------------------------------------------

        /**
         * Returns a focus on the current editor textarea.
         */
        returnFocusForTextArea: function() {
            if ( !this.selection ) return;

            $(this.selection.editor).focus();
            this.selection.editor.selectionStart =  this.selection.start;
            this.selection.editor.selectionEnd = this.selection.end;
        },

        insertHtmlForTextarea: function(html) {
            if ( !this.selection ) return;
            this.selection.editor.value =
                this.selection.editor.value.slice(0, this.selection.start)
                + html
                + this.selection.editor.value.slice(this.selection.end);

            // $(this.selection.editor).focus();

            var elem = this.selection.editor;
            var caretPos = this.selection.start + html.length;
            if (elem.createTextRange) {
                var range = elem.createTextRange();
                range.move('character', caretPos);
                range.select();
            } else if(elem.selectionStart) {
                elem.focus();
                elem.setSelectionRange(caretPos, caretPos);
            } else {
                elem.focus();
            }
            this.selection = null;
        },

        /**
         * Credits:
         * http://stackoverflow.com/questions/3964710/replacing-selected-text-in-the-textarea
         */
        getInputSelection: function(editor) {
            var start = 0, end = 0;

            if (typeof editor.selectionStart == "number" && typeof editor.selectionEnd == "number") {
                start = editor.selectionStart;
                end = editor.selectionEnd;
            }

            return {
                start: start,
                end: end,
                editor: editor
            };
        },

        saveCurrentSelection: function() {
            var self = this;

            if (!document.activeElement || !$(document.activeElement).is(".wiki-edit")) {
                var editor = self.contentWrap.find(".wiki-edit");
                this.selection = {
                    start: editor.val().length,
                    end: editor.val().length,
                    editor: editor[0]
                };
            } else {
                this.selection = this.getInputSelection(document.activeElement);
            }
        }
    };

    $(function(){
        window.imgpaste.context.init();
    });
});

