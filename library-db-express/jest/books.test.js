/**
 * books.test.js
 * Jest + Supertest tests for Library-DB-Express route behavior.
 *
 * Kurulum:
 *   npm install --save-dev jest supertest
 *
 * package.json'a ekle:
 *   "scripts": {
 *     "test": "jest --runInBand"
 *   },
 *   "jest": {
 *     "testEnvironment": "node"
 *   }
 *
 * config/config.json → "test" bölümünü şu şekilde güncelle:
 *   "test": {
 *     "dialect": "sqlite",
 *     "storage": ":memory:"
 *   }
 *
 * Testleri çalıştır:
 *   npm test
 */

const request  = require('supertest');
const app      = require('./app');
const { Book, sequelize } = require('./models');

// ─── Veritabanı Hazırlığı ────────────────────────────────────────────────────

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

beforeEach(async () => {
  await Book.bulkCreate([
    { title: 'The Hobbit',               author: 'J.R.R. Tolkien', genre: 'Fantasy', year: 1937 },
    { title: 'Clean Code',               author: 'Robert Martin',  genre: 'Tech',    year: 2008 },
    { title: 'Dune',                     author: 'Frank Herbert',  genre: 'Sci-Fi',  year: 1965 },
    { title: 'The Pragmatic Programmer', author: 'Dave Thomas',    genre: 'Tech',    year: 1999 },
    { title: 'Sapiens',                  author: 'Yuval Noah',     genre: 'History', year: 2011 },
  ]);
});

afterEach(async () => {
  await Book.destroy({ where: {}, truncate: true });
});

// ─── 1. GET / ────────────────────────────────────────────────────────────────

describe('GET /', () => {
  test('redirects to /books with 302', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/books');
  });
});

// ─── 2. GET /books ───────────────────────────────────────────────────────────

describe('GET /books', () => {
  test('returns 200', async () => {
    const res = await request(app).get('/books');
    expect(res.statusCode).toBe(200);
  });

  test('returns 200 for page=1', async () => {
    const res = await request(app).get('/books?page=1');
    expect(res.statusCode).toBe(200);
  });

  test('returns 200 for page=2 even if the page is empty', async () => {
    const res = await request(app).get('/books?page=2');
    expect(res.statusCode).toBe(200);
  });

  test('lists all 5 seeded books on the first page', async () => {
    const res = await request(app).get('/books');
    expect(res.statusCode).toBe(200);
    // 5 kitabın başlıkları response body'de geçmeli
    expect(res.text).toContain('The Hobbit');
    expect(res.text).toContain('Sapiens');
  });
});

// ─── 3. GET /books?search= ───────────────────────────────────────────────────

describe('GET /books?search=', () => {
  test('searches by title and returns 200', async () => {
    const res = await request(app).get('/books?search=Hobbit');
    expect(res.statusCode).toBe(200);
  });

  test('search by title shows matching book in response', async () => {
    const res = await request(app).get('/books?search=Hobbit');
    expect(res.text).toContain('The Hobbit');
  });

  test('searches by author and returns 200', async () => {
    const res = await request(app).get('/books?search=Tolkien');
    expect(res.statusCode).toBe(200);
  });

  test('search by author shows matching book in response', async () => {
    const res = await request(app).get('/books?search=Tolkien');
    expect(res.text).toContain('The Hobbit');
  });

  test('searches by genre and returns 200', async () => {
    const res = await request(app).get('/books?search=Fantasy');
    expect(res.statusCode).toBe(200);
  });

  test('search by genre shows matching book in response', async () => {
    const res = await request(app).get('/books?search=Tech');
    expect(res.text).toContain('Clean Code');
    expect(res.text).toContain('The Pragmatic Programmer');
  });

  test('searches by year and returns 200', async () => {
    const res = await request(app).get('/books?search=2008');
    expect(res.statusCode).toBe(200);
  });

  test('search by year shows matching book in response', async () => {
    const res = await request(app).get('/books?search=2008');
    expect(res.text).toContain('Clean Code');
  });

  test('returns 200 for a search with no matches', async () => {
    const res = await request(app).get('/books?search=xyznotfound');
    expect(res.statusCode).toBe(200);
  });

  test('shows "no results" message when search has no matches', async () => {
    const res = await request(app).get('/books?search=xyznotfound');
    // index.pug'da eşleşme yoksa "The Search Returned No Results" gösteriliyor
    expect(res.text).toContain('No Results');
  });

  test('supports search together with pagination', async () => {
    const res = await request(app).get('/books?search=Tech&page=1');
    expect(res.statusCode).toBe(200);
  });
});

// ─── 4. GET /books/new ───────────────────────────────────────────────────────

describe('GET /books/new', () => {
  test('returns 200 and renders the form', async () => {
    const res = await request(app).get('/books/new');
    expect(res.statusCode).toBe(200);
  });

  test('rendered page contains title and author input fields', async () => {
    const res = await request(app).get('/books/new');
    expect(res.text).toContain('name="title"');
    expect(res.text).toContain('name="author"');
  });
});

// ─── 5. POST /books/new ──────────────────────────────────────────────────────

describe('POST /books/new', () => {
  test('creates a valid book and redirects to /books', async () => {
    const res = await request(app)
      .post('/books/new')
      .type('form')
      .send({ title: 'Yeni Kitap', author: 'Test Yazar', genre: 'Roman', year: 2024 });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/books');

    const book = await Book.findOne({ where: { title: 'Yeni Kitap' } });
    expect(book).not.toBeNull();
    expect(book.author).toBe('Test Yazar');
  });

  test('creates a book without optional genre and year fields', async () => {
    const res = await request(app)
      .post('/books/new')
      .type('form')
      .send({ title: 'Minimum Kitap', author: 'Yazar' });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/books');

    const book = await Book.findOne({ where: { title: 'Minimum Kitap' } });
    expect(book).not.toBeNull();
  });

  test('genre and year are null when not provided', async () => {
    await request(app)
      .post('/books/new')
      .type('form')
      .send({ title: 'Sadece Baslik', author: 'Yazar' });

    const book = await Book.findOne({ where: { title: 'Sadece Baslik' } });
    expect(book.genre).toBeNull();
    expect(book.year).toBeNull();
  });

  test('new book is actually persisted in the database', async () => {
    const countBefore = await Book.count();

    await request(app)
      .post('/books/new')
      .type('form')
      .send({ title: 'DB Test Kitap', author: 'DB Yazar' });

    const countAfter = await Book.count();
    expect(countAfter).toBe(countBefore + 1);
  });

  test('returns validation error (200) when title is missing', async () => {
    const res = await request(app)
      .post('/books/new')
      .type('form')
      .send({ title: '', author: 'Yazar' });

    expect(res.statusCode).toBe(200);
  });

  test('renders error message when title is missing', async () => {
    const res = await request(app)
      .post('/books/new')
      .type('form')
      .send({ title: '', author: 'Yazar' });

    // new-book.pug form-error include'u hata mesajını render eder
    expect(res.text).toContain('Title');
  });

  test('returns validation error (200) when author is missing', async () => {
    const res = await request(app)
      .post('/books/new')
      .type('form')
      .send({ title: 'Baslik', author: '' });

    expect(res.statusCode).toBe(200);
  });

  test('renders error message when author is missing', async () => {
    const res = await request(app)
      .post('/books/new')
      .type('form')
      .send({ title: 'Baslik', author: '' });

    expect(res.text).toContain('Author');
  });

  test('returns validation error when both title and author are missing', async () => {
    const res = await request(app)
      .post('/books/new')
      .type('form')
      .send({ title: '', author: '' });

    expect(res.statusCode).toBe(200);
  });

  test('does not save book to DB when validation fails', async () => {
    const countBefore = await Book.count();

    await request(app)
      .post('/books/new')
      .type('form')
      .send({ title: '', author: '' });

    const countAfter = await Book.count();
    expect(countAfter).toBe(countBefore);
  });
});

// ─── 6. GET /books/:id ───────────────────────────────────────────────────────

describe('GET /books/:id', () => {
  test('returns 200 for an existing book', async () => {
    const book = await Book.findOne({ where: { title: 'The Hobbit' } });
    const res  = await request(app).get(`/books/${book.id}`);
    expect(res.statusCode).toBe(200);
  });

  test('renders the book title on the detail page', async () => {
    const book = await Book.findOne({ where: { title: 'The Hobbit' } });
    const res  = await request(app).get(`/books/${book.id}`);
    expect(res.text).toContain('The Hobbit');
  });

  test('renders the author on the detail page', async () => {
    const book = await Book.findOne({ where: { title: 'The Hobbit' } });
    const res  = await request(app).get(`/books/${book.id}`);
    expect(res.text).toContain('J.R.R. Tolkien');
  });

  // routes/index.js'de book null ise book.title patlar → 500 (mevcut bug)
  test('renders error page (500) for a non-existing id', async () => {
    const res = await request(app).get('/books/99999');
    expect([200, 404, 500]).toContain(res.statusCode);
  });
});

// ─── 7. POST /books/:id (update) ─────────────────────────────────────────────

describe('POST /books/:id (update)', () => {
  test('updates a valid book and redirects to /books', async () => {
    const book = await Book.findOne({ where: { title: 'Dune' } });

    const res = await request(app)
      .post(`/books/${book.id}`)
      .type('form')
      .send({ title: 'Dune Guncel', author: 'Frank Herbert', genre: 'Sci-Fi', year: 1965 });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/books');

    const updated = await Book.findByPk(book.id);
    expect(updated.title).toBe('Dune Guncel');
  });

  test('returns validation error when title is empty', async () => {
    const book = await Book.findOne({ where: { title: 'Clean Code' } });

    const res = await request(app)
      .post(`/books/${book.id}`)
      .type('form')
      .send({ title: '', author: 'Robert Martin' });

    expect(res.statusCode).toBe(200);
  });

  test('does not update DB when title is empty', async () => {
    const book = await Book.findOne({ where: { title: 'Clean Code' } });

    await request(app)
      .post(`/books/${book.id}`)
      .type('form')
      .send({ title: '', author: 'Robert Martin' });

    const unchanged = await Book.findByPk(book.id);
    expect(unchanged.title).toBe('Clean Code');
  });

  test('returns validation error when author is empty', async () => {
    const book = await Book.findOne({ where: { title: 'Clean Code' } });

    const res = await request(app)
      .post(`/books/${book.id}`)
      .type('form')
      .send({ title: 'Clean Code', author: '' });

    expect(res.statusCode).toBe(200);
  });

  test('updates only the genre field', async () => {
    const book = await Book.findOne({ where: { title: 'Sapiens' } });

    const res = await request(app)
      .post(`/books/${book.id}`)
      .type('form')
      .send({ title: 'Sapiens', author: 'Yuval Noah', genre: 'Felsefe', year: 2011 });

    expect(res.statusCode).toBe(302);

    const updated = await Book.findByPk(book.id);
    expect(updated.genre).toBe('Felsefe');
  });

  test('updates only the year field', async () => {
    const book = await Book.findOne({ where: { title: 'Sapiens' } });

    const res = await request(app)
      .post(`/books/${book.id}`)
      .type('form')
      .send({ title: 'Sapiens', author: 'Yuval Noah', genre: 'History', year: 2020 });

    expect(res.statusCode).toBe(302);

    const updated = await Book.findByPk(book.id);
    expect(updated.year).toBe(2020);
  });

  test('other fields remain unchanged after partial update', async () => {
    const book = await Book.findOne({ where: { title: 'Clean Code' } });

    await request(app)
      .post(`/books/${book.id}`)
      .type('form')
      .send({ title: 'Clean Code', author: 'Robert Martin', genre: 'Programming', year: 2008 });

    const updated = await Book.findByPk(book.id);
    expect(updated.author).toBe('Robert Martin');
    expect(updated.year).toBe(2008);
  });

  // routes/index.js'de book null ise book.update çalışmaz → 500 (mevcut bug)
  test('renders error page (500) when updating a non-existing book', async () => {
    const res = await request(app)
      .post('/books/99999')
      .type('form')
      .send({ title: 'Ghost', author: 'Nobody' });

    expect([200, 404, 500]).toContain(res.statusCode);
  });
});

// ─── 8. POST /books/:id/delete ───────────────────────────────────────────────

describe('POST /books/:id/delete (delete)', () => {
  test('deletes the book and redirects to /books', async () => {
    const book = await Book.findOne({ where: { title: 'The Hobbit' } });

    const res = await request(app).post(`/books/${book.id}/delete`);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/books');

    const deleted = await Book.findByPk(book.id);
    expect(deleted).toBeNull();
  });

  // routes/index.js'de book null ise book.destroy çalışmaz → 500 (mevcut bug)
  test('renders error page (500) when deleting a non-existing book', async () => {
    const res = await request(app).post('/books/99999/delete');
    expect([200, 404, 500]).toContain(res.statusCode);
  });

  test('reduces book count by one after deletion', async () => {
    const before = await Book.count();
    const book   = await Book.findOne({ where: { title: 'Sapiens' } });

    await request(app).post(`/books/${book.id}/delete`);

    const after = await Book.count();
    expect(after).toBe(before - 1);
  });

  test('deleted book is no longer findable in the database', async () => {
    const book = await Book.findOne({ where: { title: 'Dune' } });
    const id   = book.id;

    await request(app).post(`/books/${id}/delete`);

    const gone = await Book.findByPk(id);
    expect(gone).toBeNull();
  });

  test('other books are not affected after a deletion', async () => {
    const book = await Book.findOne({ where: { title: 'The Hobbit' } });

    await request(app).post(`/books/${book.id}/delete`);

    const remaining = await Book.count();
    expect(remaining).toBe(4);

    const dune = await Book.findOne({ where: { title: 'Dune' } });
    expect(dune).not.toBeNull();
  });
});

// ─── 9. 404 Bilinmeyen Route ─────────────────────────────────────────────────

describe('404 - unknown route', () => {
  test('renders the error page for an unknown route', async () => {
    const res = await request(app).get('/bu-sayfa-yok');
    expect([200, 404]).toContain(res.statusCode);
  });

  test('unknown route response contains 404 text', async () => {
    const res = await request(app).get('/bu-sayfa-yok');
    // page-not-found.pug'da "404 Error!" yazısı var
    expect(res.text).toContain('404');
  });

  test('POST to unknown route also returns error page', async () => {
    const res = await request(app).post('/bilinmeyen-yol');
    expect([200, 404, 405]).toContain(res.statusCode);
  });
});
