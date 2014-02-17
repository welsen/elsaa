function ResetAddForm() {
    $('#add-permission div.modal-body form div div input#input-permission-name').val('');
    $('#add-permission div.modal-body form div div textarea#input-permission-description').val('');
    $('#add-permission div.modal-body form div div input#input-permission-deletable').prop('checked', false);
}

function AddPermission(parent, name, description, deletable, callback) {
    AsyncRPC('/admin/permissions/add', {
        parent: parent,
        name: name,
        description: description,
        deletable: deletable
    }, callback);
}

function ProcessPermission(permissionList) {
    $('#permissionListBody').empty();
    $.each(permissionList, function (index, item) {
        var deletable = __elsaa_user_perms["Delete Permission"] ? (item.DELETABLE == 1 ? false : true) : true;
        var buttonGroup = '<div class="btn-group btn-group-xs"><button class="btn btn-default" ' + (__elsaa_user_perms['Modify Permission'] ? '' : 'disabled') + '>Modify</button><button class="btn btn-default" ' + (deletable ? 'disabled' : '') + '>Delete</button></div>'
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
