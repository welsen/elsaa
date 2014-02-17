function AsyncRPC(url, data, callback) {
    $.ajax({
        url: url,
        type: 'POST',
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify(data),
        dataType: 'json',
        headers: {
            'cache-control': 'no-cache'
        },
        success: callback,
        error: callback
    });

}
