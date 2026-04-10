/**
 * NavHub API Client
 * Handles communication with the PHP backend
 */

const API_ENDPOINT = 'api.php';

export const api = {
    async request(action, method = 'GET', data = null) {
        try {
            const options = {
                method,
                headers: {}
            };

            if (data) {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(data);
            }

            const res = await fetch(`${API_ENDPOINT}?action=${action}`, options);

            if (res.status === 401) {
                throw new Error('UNAUTHORIZED');
            }

            if (!res.ok) {
                throw new Error(`HTTP Error: ${res.status}`);
            }

            return await res.json();
        } catch (error) {
            console.error(`API ${action} Error:`, error);
            throw error;
        }
    },

    async checkAuth() {
        return this.request('check_auth');
    },

    async login(password) {
        return this.request('login', 'POST', { password });
    },

    async logout() {
        return this.request('logout');
    },

    async get() {
        return this.request('get');
    },

    async add(tool) {
        return this.request('add', 'POST', tool);
    },

    async update(tool) {
        return this.request('update', 'POST', tool);
    },

    async delete(id) {
        return this.request('delete', 'POST', { id });
    },

    async saveOrder(order) {
        return this.request('saveOrder', 'POST', { order });
    }
};
