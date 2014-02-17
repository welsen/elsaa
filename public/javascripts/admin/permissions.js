function ResetAddForm() {
    $('#input-permission-name').val('');
    $('#input-permission-description').val('');
    $('#input-permission-deletable').prop('checked', false);
}

function AddPermission(parent, name, description, deletable, callback) {
    $.ajax({
        url: '/admin/permissions/add',
        type: 'POST',
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify({
            parent: parent,
            name: name,
            description: description,
            deletable: deletable
        }),
        dataType: 'json',
        headers: {
            'cache-control': 'no-cache'
        },
        success: callback,
        error: callback
    });
}

$('#add-permission-close-btn').click(function (e) {
    ResetAddForm();
});
$('#add-permission-ok-btn').click(function (e) {
    var parent = $('#input-permission-parent').select2('val');
    var name = $('#input-permission-name').val();
    var description = $('#input-permission-description').val();
    var deletable = $('#input-permission-deletable').is(':checked');
    AddPermission(parent, name, description, deletable, function (result) {
        console.log(result);
    });
    ResetAddForm();
});
