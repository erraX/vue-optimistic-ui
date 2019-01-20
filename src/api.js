export function update(data) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const random = Math.random();
            if (random < 1) {
                console.log('success');
                return resolve({success: true});
            }
            console.log('fail');
            return reject({success: false});
        }, 2000);
    });
}
