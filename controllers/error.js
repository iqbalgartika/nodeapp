exports.get404 = (req,res,next) => {
    res.status(404).render('404', {
        pageTitle: 'Page Not Found',
        path: '/404'
    });
};

exports.get500 = (req,res,next) => {
    res.status(500).render('500', {
        pageTitle: 'Error',
        path: '/500'
    });
};

exports.handler = (err, next) => {
    console.log(err);
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
}