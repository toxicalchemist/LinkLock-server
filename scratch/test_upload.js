const axios = require('axios');
const FormData = require('form-data');

async function test() {
    const formData = new FormData();
    formData.append('key', 'test_key_' + Date.now());
    formData.append('encryptedContent', 'test_content');
    formData.append('iv', 'auto');
    formData.append('viewLimit', '1');
    formData.append('expiryValue', '1');
    formData.append('expiryUnit', 'Hours');
    formData.append('file', Buffer.from('test file content'), 'test.txt');

    try {
        const response = await axios.post('http://localhost:5000/api/secrets', formData, {
            headers: formData.getHeaders()
        });
        console.log('Status:', response.status);
        console.log('Data:', response.data);
    } catch (error) {
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', error.response.data);
        } else {
            console.log('Error:', error.message);
        }
    }
}

test();
