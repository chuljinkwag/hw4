import { Link } from 'react-router-dom'
import { Seal } from '../components/Decor.tsx'
import ProductImage from '../components/ProductImage.tsx'
import Reveal from '../components/Reveal.tsx'

const MOSAIC = ['district-vit-crewneck-vintage-bulldog', 'champion-full-zip-hood', 'yale-bowl-t-shirt']

export default function About() {
  return (
    <section className="page about">
      <div className="about-copy">
        <p className="eyebrow">About Us</p>
        <h1>More than a logo on a sweatshirt.</h1>
        <p className="lede drop-cap">
          Campus Customs is the oldest official Yale merchandise retailer in New Haven, and we have long believed that
          a good piece of campus apparel is about more than the logo on the front. It is a way for students, alumni
          and families to feel that they belong to something larger than themselves, whether they are moving into
          their first residential college or coming back for their twenty-fifth reunion.
        </p>
        <p>
          Our shop at 57 Broadway carries one of the largest selections of officially licensed Yale merchandise you
          will find: T-shirts, sweatshirts, hats, kids' apparel, alumni gear and school supplies. Beyond the shelves,
          we also offer screen printing, embroidery, digital printing and promotional items for your next event,
          student organization, business or even a family reunion.
        </p>
        <blockquote className="pull-quote">
          “A way for students, alumni and families to feel that they belong to something larger than themselves.”
        </blockquote>
        <p>
          We have always believed that a well-rounded shop is a better shop, which is why we take as much care with a
          custom order for a small club as we do with our best-selling hoodie. Hopefully, that means you will be
          treated as a neighbour rather than an order number, something we find is sorely lacking at stores where
          nobody remembers your name by the time you walk out the door.
        </p>
        <p>
          All in all, we are proud to be part of New Haven and of the Yale community. It is our hope that every
          shopper, whether a first-year, a proud parent or a visitor from the other side of the world, leaves with
          something that reminds them that they too belong here.
        </p>
        <Link to="/products" className="button">Shop the collection</Link>
      </div>

      <aside className="about-facts" aria-label="Shop details">
        <Seal size={72} />
        <dl>
          <dt>Visit</dt>
          <dd>57 Broadway<br />New Haven, CT 06511</dd>
          <dt>Hours</dt>
          <dd>Open seven days a week</dd>
          <dt>Licensing</dt>
          <dd>Officially licensed Yale merchandise</dd>
          <dt>Custom work</dt>
          <dd>Screen printing · Embroidery · Digital printing · Promotional items</dd>
        </dl>
      </aside>

      <Reveal className="about-mosaic" as="div">
        {MOSAIC.map((id) => (
          <Link key={id} to={`/products/${id}`} className="mosaic-tile">
            <ProductImage src={`/media/products/${id}.jpg`} alt="" />
          </Link>
        ))}
      </Reveal>
    </section>
  )
}
