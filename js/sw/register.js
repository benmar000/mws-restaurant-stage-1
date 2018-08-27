if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js').then(function (registration) {
            //registration was successful 
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, function (err) {
            //registration failed 
            console.log('Registration unsuccesful with error: ', err);
        });
    });
}




