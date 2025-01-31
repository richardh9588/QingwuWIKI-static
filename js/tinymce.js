/**
 * ---------------------------------
 *
 *  当前在用的编辑器
 *  @Update(2020-08-21)
 *
 * ---------------------------------
 */


/**
 * 设置编辑器变更状态
 * @param $is_change
 */
function resetEditorChanged($is_change) {
    if ($is_change && !window.isLoad) {
        $("#markdown-save").removeClass('disabled').addClass('change');
    } else {
        $("#markdown-save").removeClass('change').addClass('disabled');
    }
    window.isLoad = false;
}

/**
 * 保存文档到服务器
 * @param $is_cover 是否强制覆盖
 * @param callback
 */
function saveDocument($is_cover,callback) {
    var index = null;
    var node = window.selectNode;

    var html = tinymce.activeEditor.getContent();

    var content = "";
    if($.trim(html) !== ""){
        content = toMarkdown(html, { gfm: true });
    }
    var version = "";

    if(!node){
        layer.msg("获取当前文档信息失败");
        return;
    }
    var doc_id = parseInt(node.id);

    for(var i in window.documentCategory){
        var item = window.documentCategory[i];

        if(item.id === doc_id){
            version = item.version;
            break;
        }
    }
    var origin_html = "not_set";
    if("save-origin-html" === callback){
        origin_html = html
    }
    $.ajax({
        beforeSend  : function () {
            index = layer.load(1, {shade: [0.1,'#fff'] });
            window.saveing = true;
        },
        url :  window.editURL,
        data : {
            "identify" : window.book.identify,
            "doc_id" : doc_id,
            "markdown" : content,
            "html" : html,
            "origin_html":origin_html,
            "cover" : $is_cover ? "yes":"no",
            "version": version
        },
        type :"post",
        dataType :"json",
        success : function (res) {
            if(res.errcode === 0){
                for(var i in window.documentCategory){
                    var item = window.documentCategory[i];

                    if(item.id === doc_id){
                        window.documentCategory[i].version = res.data.version;
                        break;
                    }
                }
                resetEditorChanged(false);
                // 更新内容备份
                window.source = res.data.content;
                if(typeof callback === "function"){
                    callback();
                }
            }else if(res.errcode === 6005){
                var confirmIndex = layer.confirm('文档已被其他人修改确定覆盖已存在的文档吗？', {
                    btn: ['确定','取消'] //按钮
                }, function(){
                    layer.close(confirmIndex);
                    saveDocument(true,callback);
                });
            }else{
                layer.msg(res.message);
            }
        },
        error : function (XMLHttpRequest, textStatus, errorThrown) {
            layer.msg("服务器错误：" +  errorThrown);
        },
        complete :function () {
            layer.close(index);
            window.saveing = false;
        }
    });
}

/**
 * 监听按键
 * @param e
 */
function editorKeyDown(e)
{
    var num = e.which?e.which:e.keyCode;
    if(e.ctrlKey && num === 83 )
    {
        window.saveDocument();
        window.save_flag_s = true;
        window.save_flag_ctrl = true;
        e.preventDefault();
    }
}

/**
 * 上传图片
 * @param $blobInfo
 * @param success
 * @param failure
 */
function upload_image_blob($blobInfo, success, failure){
    // window.test_img = $blobInfo;  // 用作测试

    var imageFile = $blobInfo.blob();

    var fileName = String((new Date()).valueOf());

    fileName += "." + $blobInfo.filename().split(".").pop();

    var form = new FormData();
    form.append('editormd-image-file', imageFile, fileName);

    var layerIndex = 0;

    $.ajax({
        url: window.imageUploadURL,
        type: "POST",
        dataType: "json",
        data: form,
        processData: false,
        contentType: false,
        beforeSend: function () {
            layerIndex = layer.load(1, {
                shade: [0.1, '#fff'] // 0.1 透明度的白色背景
            });
        },
        error: function () {
            layer.close(layerIndex);
            failure("上传失败");
            layer.msg("图片上传失败");
        },
        success: function (data) {
            layer.close(layerIndex);
            if (data.errcode === 0) {
                // TODO: 此处应该更新
                // console.log(data);
                var img_url = data.url.replace("/D:/ProgrammingTools/Go/GoPath/src/github.com/lifei6671/mindoc","");
                // console.log(img_url);
                success(img_url);
            }
            if (data.errcode !== 0) {
                layer.msg(data.message);
                failure("上传出错")
            }

        }
    });

}

/**
 * 初始化回调
 * @param editor
 */
function editor_init_callback(editor){
    window.editor = editor;
    // Change
    window.editor.on("Change KeyUp",function () {
        if(window.save_flag_s===true){
            window.save_flag_s=false;
            return;
        }else if(window.save_flag_ctrl===true){
            window.save_flag_ctrl = false;
            return;
        }
        else{
            resetEditorChanged(true);
        }
    });
    var $editorEle =  $("#editormd-tools");

    $editorEle.find(".ql-undo").on("click",function () {
        window.editor.history.undo();
    });
    $editorEle.find(".ql-redo").on("click",function () {
        window.editor.history.redo();
    });
    $editorEle.find(".ql-finish").on("click",function () {
        saveDocument(false, previewDoc);
    });
    $editorEle.find(".ql-save-origin-html").on("click",function () {  // 点击 完成 按钮触发
        saveDocument(false, "save-origin-html");
    });
    $editorEle.find(".ql-view-origin-html").on("click",function () {  // 点击 查看 按钮触发
        // 查看 Origin HTML
        viewDocOriginHtml();
    });


    window.editor.on("KeyDown",function (e) {
        editorKeyDown(e)
    });
    window.save_flag_ctrl =false;
    window.save_flag_s = false;  // 默认为false,如果按下了ctrl+s 则触发为true
    // addEvent(window.editor ,"keydown",function (e){});
    $(function () {
        window.addDocumentModalFormHtml = $(this).find("form").html();
        window.menu_save = $("#markdown-save");
        window.uploader = null;

        $("#btnRelease").on("click",function () {
            if (Object.prototype.toString.call(window.documentCategory) === '[object Array]' && window.documentCategory.length > 0) {
                if ($("#markdown-save").hasClass('change')) {
                    var comfirm_result = confirm("编辑内容未保存，需要保存吗？");
                    if (comfirm_result) {
                        saveDocument(false, releaseBook);
                        return;
                    }
                }

                releaseBook();
            } else {
                layer.msg("没有需要发布的文档")
            }
        });


        /**
         * 实现保存
         */
        window.menu_save.on("click",function () {if($(this).hasClass('change')){saveDocument();}});


        /***
         * 加载指定的文档到编辑器中
         * @param $node
         */
        function loadDocument($node) {

            var index = layer.load(1, {
                shade: [0.1,'#fff'] //0.1透明度的白色背景
            });

            $.get(window.editURL + $node.node.id ).done(function (res) {
                layer.close(index);

                if(res.errcode === 0){
                    window.isLoad = true;
                    tinymce.activeEditor.setContent(res.data.content);

                    // 将原始内容备份
                    window.source = res.data.content;
                    var node = {
                        "id" : res.data.doc_id,
                        'parent' : res.data.parent_id === 0 ? '#' : res.data.parent_id ,
                        "text" : res.data.doc_name,
                        "identify" : res.data.identify,
                        "version" : res.data.version,
                        "origin_url": res.data.origin_url,  // 2020-08-16 增加
                        "release_date": res.data.release_date,
                        "source": res.data.source,
                        "number": res.data.number,  // 2020-08-31 新增
                        "labels": res.data.labels,  // 2020-08-19 增加
                        "is_star": res.data.is_star,
                        "is_doc": res.data.is_doc, // 2020-08-30 新增
                        "is_resume": res.data.is_resume
                    };
                    $node.node["origin_url"] = res.data.origin_url;  // 2020-08-16 增加
                    $node.node["release_date"] = res.data.release_date;
                    $node.node["source"] = res.data.source;
                    $node.node["number"] = res.data.number;  // 2020-08-31 新增 编号 字段
                    $node.node["labels"] = res.data.labels;  // 2020-08-19 增加
                    $node.node["is_star"] = res.data.is_star;  // 是否星标
                    $node.node["is_doc"] = res.data.is_doc;
                    $node.node["is_resume"] = res.data.is_resume;
                    window.markdown_editable = res.data.markdown_editable;  // 2020-08-19 增加
                    if (window.markdown_editable != 1){
                        $("#editor_changer").hide();
                    }else{
                        $("#editor_changer").show();
                    }
                    pushDocumentCategory(node);
                    window.selectNode = node;
                    window.isLoad = true;
                    window.modified_node = node;  // 修改后使得结果立即可见
                    pushVueLists(res.data.attach);
                    initHighlighting();
                    setLastSelectNode($node);
                }else{
                    layer.msg("文档加载失败");
                }
            }).fail(function () {
                layer.close(index);
                layer.msg("文档加载失败");
            });
        }




        /**
         * 添加顶级文档
         */
        $("#addDocumentForm").ajaxForm({
            beforeSubmit : function () {
                var doc_name = $.trim($("#documentName").val());
                if (doc_name === ""){
                    return showError("目录名称不能为空","#add-error-message")
                }
                window.addDocumentFormIndex = layer.load(1, { shade: [0.1,'#fff']  });
                return true;
            },
            success : function (res) {
                if(res.errcode === 0){

                    var data = {
                        "id" : res.data.doc_id,
                        'parent' : res.data.parent_id === 0 ? '#' : res.data.parent_id ,
                        "text" : res.data.doc_name,
                        "identify" : res.data.identify,
                        "version" : res.data.version,
                        state: { opened: res.data.is_open == 1},
                        a_attr: { is_open: res.data.is_open == 1},
                        "origin_url": res.data.origin_url,  // 2020-08-16 增加
                        "release_date": res.data.release_date,
                        "source": res.data.source
                    };

                    var node = window.treeCatalog.get_node(data.id);
                    if(node){
                        window.treeCatalog.rename_node({"id":data.id},data.text);
                        $("#sidebar").jstree(true).get_node(data.id).a_attr.is_open = data.state.opened;
                    }else {
                        window.treeCatalog.create_node(data.parent, data);
                        window.treeCatalog.deselect_all();
                        window.treeCatalog.select_node(data);
                    }
                    pushDocumentCategory(data);
                    $("#markdown-save").removeClass('change').addClass('disabled');
                    $("#addDocumentModal").modal('hide');
                }else{
                    showError(res.message,"#add-error-message")
                }
                layer.close(window.addDocumentFormIndex);
            }
        });

        /**
         * 文档目录树
         */
        $("#sidebar").jstree({
            'plugins': ["wholerow", "types", 'dnd', 'contextmenu'],
            "types": {
                "default": {
                    "icon": false  // 删除默认图标
                }
            },
            'core': {
                'check_callback': true,
                "multiple": false,
                'animation': 0,
                "data": window.documentCategory
            },
            "contextmenu": {
                show_at_node: false,
                select_node: false,
                "items": {
                    "添加文档": {
                        "separator_before": false,
                        "separator_after": true,
                        "_disabled": false,
                        "label": "添加文档",
                        "icon": "fa fa-plus",
                        "action": function (data) {

                            var inst = $.jstree.reference(data.reference),
                                node = inst.get_node(data.reference);

                            openCreateCatalogDialog(node);
                        }
                    },
                    "编辑": {
                        "separator_before": false,
                        "separator_after": true,
                        "_disabled": false,
                        "label": "编辑",
                        "icon": "fa fa-edit",
                        "action": function (data) {
                            var inst = $.jstree.reference(data.reference);
                            var node = inst.get_node(data.reference);
                            openEditCatalogDialog(node);
                        }
                    },
                    "删除": {
                        "separator_before": false,
                        "separator_after": true,
                        "_disabled": false,
                        "label": "删除",
                        "icon": "fa fa-trash-o",
                        "action": function (data) {
                            var inst = $.jstree.reference(data.reference);
                            var node = inst.get_node(data.reference);
                            openDeleteDocumentDialog(node);
                        }
                    }
                }
            }
        }).on('ready.jstree', function () {
            window.treeCatalog = $(this).jstree();
            //如果没有选中节点则选中默认节点
            openLastSelectedNode();

        }).on('select_node.jstree', function (node, selected, event) {
            if(window.menu_save.hasClass('change')) {
                if(confirm("编辑内容未保存，需要保存吗？")){
                    saveDocument(false,function () {
                        loadDocument(selected);
                    });
                    return true;
                }
            }
            loadDocument(selected);

        }).on("move_node.jstree", jstree_save)
            .on("delete_node.jstree",function (node,parent) {
                window.isLoad = true;
                // window.editor.root.innerHTML ='';
                window.editor.setContent("")
            });

        window.saveDocument = saveDocument;

        window.releaseBook = function () {
            if(Object.prototype.toString.call(window.documentCategory) === '[object Array]' && window.documentCategory.length > 0){
                if(window.menu_save.hasClass('selected')) {
                    if(confirm("编辑内容未保存，需要保存吗？")) {
                        saveDocument();
                    }
                }
                $.ajax({
                    url : window.releaseURL,
                    data :{"identify" : window.book.identify },
                    type : "post",
                    dataType : "json",
                    success : function (res) {
                        if(res.errcode === 0){
                            layer.msg("发布任务已推送到任务队列，稍后将在后台执行。");
                        }else{
                            layer.msg(res.message);
                        }
                    }
                });
            }else{
                layer.msg("没有需要发布的文档")
            }
        };
    });
    // if (_this.value) {
    //     editor.setContent(_this.value)
    // }
    // _this.hasInit = true;
    // editor.on('NodeChange Change KeyUp', () => {
    //     this.hasChange = true;
    //     this.$emit('input', editor.getContent({ format: 'raw' }));
    // });

}


tinymce.init({
    // 选择class为content的标签作为编辑器
    selector: '#content',
    //方向从左到右
    directionality:'ltr',
    //语言选择中文
    language:'zh_CN',
    //高度为400
    // height:400,
    //工具栏上面的补丁按钮
    plugins: [
        'advlist autolink link image lists charmap print preview hr anchor pagebreak spellchecker',
        'searchreplace wordcount visualblocks visualchars code fullscreen insertdatetime media nonbreaking',
        'table contextmenu directionality emoticons template paste textcolor', 'textpattern',
        'codesample'
    ], // advtable
    // menubar: 'table',
    // 工具栏的补丁按钮       bold italic |      alignleft aligncenter alignright alignjustify |
    toolbar: 'insertfile undo redo | \
     styleselect | \
     bullist numlist outdent indent | fontsizeselect forecolor backcolor |\
     link image | \
     print preview fullpage | \
     codesample fullscreen',  // media emoticons
    // 字体大小
    fontsize_formats: '10pt 12pt 14pt 18pt 24pt 36pt',
    // 按tab不换行
    nonbreaking_force_tab: true,
    branding: false,  // 隐藏右下角技术支持
    paste_data_images:true,
    fixed_toolbar_container: '#editor_toolbar',
    default_link_target: "_blank",  // 链接在新窗口打开
    relative_urls : false,
    remove_script_host : true,
    images_upload_handler: upload_image_blob,  // 上传图片
    init_instance_callback: editor_init_callback// editor

});


