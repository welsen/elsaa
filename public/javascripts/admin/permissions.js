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
                console.log(result);
            });
        }
    });
    ResetAddForm();
});
