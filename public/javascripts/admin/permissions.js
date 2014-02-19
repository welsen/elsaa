function ResetAddForm() {
    $('#add-permission div.modal-body form div div input#input-permission-name').val('');
    $('#add-permission div.modal-body form div div textarea#input-permission-description').val('');
    $('#add-permission div.modal-body form div div input#input-permission-deletable').prop('checked', false);
}

function ResetEditForm() {
    $('#edit-permission div.modal-body form div div input#input-permission-name').val('');
    $('#edit-permission div.modal-body form div div textarea#input-permission-description').val('');
    $('#edit-permission div.modal-body form div div input#input-permission-deletable').prop('checked', false);
}

function AddPermission(parent, name, description, deletable, callback) {
    AsyncRPC('/admin/permissions/add', {
        parent: parent,
        name: name,
        description: description,
        deletable: deletable
    }, callback);
}

function EditPermission(id, description, callback) {
    AsyncRPC('/admin/permissions/edit', {
        id: id,
        description: description
    }, callback);
}

function ProcessPermission(permissionList) {
    __elsaa_user_permissionList = permissionList;
    $('#permissionListBody').empty();
    $.each(permissionList, function (index, item) {
        var deletable = __elsaa_user_perms["Delete Permission"] ? (item.DELETABLE == 1 ? false : true) : true;
        var canModify = __elsaa_user_perms["Modify Permission"];
        var buttonGroup = '<div class="btn-group btn-group-xs"><button class="btn btn-default modify-button" ' + (canModify ? '' : 'disabled') + ' data-permission-id="' + item.ID + '">Modify</button><button class="btn btn-default delete-button" ' + (deletable ? 'disabled' : '') + ' data-permission-id="' + item.ID + '">Delete</button></div>';
        var tr = $('<tr>').append(
            '<td><input type="checkbox" data-permission-id="' + item.ID + '"></td><td>' + item.NAME + '</td><td>' + item.DESCRIPTION + '</td><td>' + buttonGroup + '</td>'
        );
        tr.appendTo($('#permissionListBody'));
    });
}

$('#add-permission div.modal-footer button#add-permission-close-btn').click(function (e) {
    ResetAddForm();
});
$('#add-permission div.modal-footer button#add-permission-ok-btn').click(function (e) {
    var parent = $('#add-permission div.modal-body form div div select#input-permission-parent').select2('val');
    var name = $('#add-permission div.modal-body form div div input#input-permission-name').val();
    var description = $('#add-permission div.modal-body form div div textarea#input-permission-description').val();
    var deletable = $('#add-permission div.modal-body form div div input#input-permission-deletable').is(':checked');
    AddPermission(parent, name, description, deletable, function (result) {
        if (result == true) {
            AsyncRPC('/admin/permissions/all', {}, function (result) {
                ProcessPermission(result);
            });
        }
    });
    ResetAddForm();
});

$('#edit-permission div.modal-footer button#edit-permission-close-btn').click(function (e) {
    ResetAddForm();
});
$('#edit-permission div.modal-footer button#edit-permission-ok-btn').click(function (e) {
    var parent = $('#edit-permission div.modal-body form div div select#input-permission-parent').select2('val');
    var name = $('#edit-permission div.modal-body form div div input#input-permission-name').val();
    var description = $('#edit-permission div.modal-body form div div textarea#input-permission-description').val();
    var deletable = $('#edit-permission div.modal-body form div div input#input-permission-deletable').is(':checked');
    EditPermission(id, description, function (result) {
        if (result == true) {
            AsyncRPC('/admin/permissions/all', {}, function (result) {
                ProcessPermission(result);
            });
        }
    });
    ResetAddForm();
});

$('.modify-button').on({
    'click': function (e) {
        var btn = e.currentTarget;
        var permission = $.grep(__elsaa_user_permissionList, function (item, index) {
            return item.ID == $(btn).data('permissionId');
        })[0];
        $('#edit-permission div.modal-body form div div input#input-permission-name').val(permission.NAME);
        $('#edit-permission div.modal-body form div div textarea#input-permission-description').val(permission.DESCRIPTION);
        $('#edit-permission div.modal-body form div div input#input-permission-deletable').prop('checked', permission.DELETABLE == 1);
    }
});
