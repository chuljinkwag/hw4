import { Link } from 'react-router-dom'
import { askAssistant } from '../api.ts'
import { Awning, Pennant } from './Decor.tsx'

export default function Footer() {
  return (
    <footer className="site-footer">
      <Awning className="awning-flip" />
      <div className="footer-inner">
        <div className="footer-lead">
          <Pennant label="BOOLA BOOLA" className="footer-pennant" />
          <p className="footer-wordmark">Campus Customs</p>
          <p>Yale Bulldog Blue by Campus Customs. Officially licensed Yale merchandise, from New Haven's oldest official Yale retailer.</p>
        </div>
        <div>
          <p className="footer-heading">Visit the shop</p>
          <address>
            57 Broadway
            <br />New Haven, CT 06511
            <br />Open seven days a week
          </address>
        </div>
        <div>
          <p className="footer-heading">Shop</p>
          <ul>
            <li><Link to="/products">All products</Link></li>
            <li><Link to="/products?category=hoodie">Hoodies</Link></li>
            <li><Link to="/products?category=crewneck">Crewnecks</Link></li>
            <li><Link to="/products?category=t-shirt">T-shirts</Link></li>
          </ul>
        </div>
        <div>
          <p className="footer-heading">Help</p>
          <ul>
            <li>
              <button type="button" className="footer-link-button" onClick={() => askAssistant('What sizes do you carry?')}>
                Ask the assistant
              </button>
            </li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/create-account">Create account</Link></li>
          </ul>
        </div>
      </div>
      <p className="footer-fine">© Campus Customs · Yale Bulldog Blue · 57 Broadway, New Haven</p>
    </footer>
  )
}
