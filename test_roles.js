
    requireAuthOrRedirect();

    const houseImages = {
      'gryffondor': 'gryffindor.png',
      'serpentard': 'slytherin.png',
      'serdaigle': 'ravenclaw.png',
      'poufsouffle': 'hufflepuff.png'
    };

    const HOUSE_CLASS = {
      'gryffondor': 'gryf',
      'serpentard': 'sly',
      'serdaigle': 'rav',
      'poufsouffle': 'huff'
    };

    const PILL_CLASS = {
      'gryffondor': 'pill-gryf',
      'serpentard': 'pill-sly',
      'serdaigle': 'pill-rav',
      'poufsouffle': 'pill-huff'
    };

    function createRoleCard(r) {
      const card = document.createElement('div');
      card.className = 'role-card';
      
      const houseImgFile = houseImages[r.house] || 'logo.png';
      
      const houseHtml = r.house 
        ? `<div style="font-size:0.75rem; color:var(--text-dim); margin-top:0.3rem;"><img src="../img/${houseImgFile}" style="width:16px;height:16px;vertical-align:middle;"> ${r.house.charAt(0).toUpperCase() + r.house.slice(1)}</div>` 
        : '';
        
      card.innerHTML = `
        <div style="display:flex; gap:1rem; align-items:center;">
          <img src="../img/${r.house ? houseImgFile : 'logo.png'}" alt="Avatar" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:1px solid rgba(255,255,255,0.1);">
          <div>
            <div style="font-family:'Cinzel',serif; font-size:1rem; color:var(--gold);">${r.name}</div>
            <div style="font-size:0.8rem; color:var(--cream-dim);">${r.rank} ${r.role && r.role !== 'Aucune' ? '- ' + r.role : ''}</div>
            ${houseHtml}
          </div>
        </div>
      `;
      return card;
    }

    async function initRoles() {
      const user = requireAuthOrRedirect();
      if (Auth.hasPermission('manage_roles')) {
        document.getElementById('btn-manage-roles').style.display = 'inline-block';
      }

      const roles = await DataStore.getRoles();
      document.getElementById('total-staff-badge').textContent = roles.length + ' membres';

      // Director (by rank or role)
      const director = roles.find(r => (r.rank && r.rank.includes('Directeur')) || (r.role && r.role.includes('Directeur') && !r.house));
      if (director) {
        document.getElementById('director-card').innerHTML = `
          <div class="director-avatar">${director.avatar || '🎓'}</div>
          <div class="director-info">
            <div class="director-label">Direction de Mysteria</div>
            <div class="director-name">${director.name}</div>
            <div class="director-role">${director.rank} ${director.role && director.role !== 'Aucune' ? '- ' + director.role : ''}</div>
            <div style="margin-top:0.75rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
              <span class="badge badge-gold">⭐ Direction</span>
            </div>
          </div>
        `;
        document.getElementById('director-card').style.display = 'flex';
      } else {
        document.getElementById('director-card').style.display = 'none';
      }

      const CATEGORIES = [
        { label: 'Grands Professeurs', icon: '🌟', filter: r => r.rank === 'Grand Professeur' },
        { label: 'Professeurs Expérimentés', icon: '✨', filter: r => r.rank === 'Professeur Expérimenté' },
        { label: 'Professeurs Confirmés', icon: '📖', filter: r => r.rank === 'Professeur Confirmé' },
        { label: 'Professeurs', icon: '📚', filter: r => r.rank === 'Professeur' },
        { label: 'Professeurs Apprentis', icon: '🌱', filter: r => r.rank === 'Professeur Apprenti' },
        { label: 'Rédacteurs & Autre', icon: '✍️', filter: r => r.rank === 'Rédacteur' || (!r.rank?.includes('Professeur') && !r.rank?.includes('Directeur')) }
      ];

      const content = document.getElementById('roles-content');
      content.innerHTML = '';

      CATEGORIES.forEach(cat => {
        const members = roles.filter(cat.filter);
        if (members.length === 0) return;

        const section = document.createElement('div');
        section.className = 'role-section fade-in';
        section.innerHTML = `
          <div class="role-section-header">
            <div class="role-section-icon">${cat.icon}</div>
            <div class="role-section-title">${cat.label}</div>
            <span class="role-section-count">${members.length} membre${members.length > 1 ? 's' : ''}</span>
          </div>
          <div class="staff-grid" id="grid-${cat.label.replace(/\s/g,'_')}"></div>
        `;
        content.appendChild(section);

        const grid = section.querySelector('.staff-grid');
        members.forEach(m => {
          if (director && m.id === director.id) return; // Skip showing director in the normal grid if they are highlighted

          const houseClass = m.house ? HOUSE_CLASS[m.house] || 'none' : 'none';
          const card = document.createElement('div');
          card.className = `staff-card house-${houseClass}`;
          card.innerHTML = `
            <div class="staff-avatar">${m.avatar || '🎓'}</div>
            <div class="staff-name">${m.name}</div>
            <div class="staff-role">${m.rank || 'Professeur'}</div>
            ${m.role && m.role !== 'Aucune' ? `<div style="margin-bottom:0.4rem;"><span class="staff-badge">${m.role}</span></div>` : '<div style="margin-bottom:0.4rem;"><span class="staff-badge" style="opacity:0;">-</span></div>'}
            ${m.house ? `<div><span class="staff-house-pill ${PILL_CLASS[m.house] || ''}">${m.house}</span></div>` : ''}
          `;
          grid.appendChild(card);
        });
      });
    }

    async function openManageRoles() {
      const roles = await DataStore.getRoles();
      const list = document.getElementById('manage-roles-list');
      list.innerHTML = '';
      
      roles.forEach(m => {
        const div = document.createElement('div');
        div.style.display = 'grid';
        div.style.gridTemplateColumns = '2fr 1.5fr 1.5fr auto';
        div.style.gap = '0.5rem';
        div.style.alignItems = 'center';
        div.style.padding = '0.5rem';
        div.style.background = 'var(--bg-dark)';
        div.style.border = '1px solid var(--border)';
        div.style.borderRadius = '8px';
        
        div.innerHTML = `
          <div style="font-family:'Cinzel',serif; font-size:0.8rem; overflow:hidden; text-overflow:ellipsis;">${m.name}</div>
          <select class="form-input" id="rank-${m.id}" style="padding:0.4rem; font-size:0.75rem;">
            <option value="Professeur Apprenti" ${m.rank === 'Professeur Apprenti' ? 'selected' : ''}>Apprenti</option>
            <option value="Professeur" ${m.rank === 'Professeur' ? 'selected' : ''}>Professeur</option>
            <option value="Professeur Confirmé" ${m.rank === 'Professeur Confirmé' ? 'selected' : ''}>Confirmé</option>
            <option value="Professeur Expérimenté" ${m.rank === 'Professeur Expérimenté' ? 'selected' : ''}>Expérimenté</option>
            <option value="Grand Professeur" ${m.rank === 'Grand Professeur' ? 'selected' : ''}>Grand Professeur</option>
            <option value="Directeur" ${m.rank === 'Directeur' ? 'selected' : ''}>Directeur</option>
            <option value="Rédacteur" ${m.rank === 'Rédacteur' ? 'selected' : ''}>Rédacteur</option>
          </select>
          <input type="text" class="form-input" id="role-${m.id}" value="${m.role || 'Aucune'}" style="padding:0.4rem; font-size:0.75rem;" placeholder="Fonction (ex: Gérant...)">
          <button class="btn btn-sm btn-primary" onclick="saveRole(${m.id})">💾</button>
        `;
        list.appendChild(div);
      });
      
      document.getElementById('manage-roles-modal').classList.add('active');
    }

    function closeManageRoles() {
      document.getElementById('manage-roles-modal').classList.remove('active');
    }

    async function saveRole(id) {
      const rank = document.getElementById(`rank-${id}`).value;
      const role = document.getElementById(`role-${id}`).value;
      const res = await DataStore.updateProfessor(id, { rank, role });
      if (res && res.ok) {
        showToast('Rôles mis à jour !', 'success');
        initRoles();
      } else {
        console.error('Failed to save role', { id, rank, role, res });
        showToast((res && res.error) || 'Erreur de mise à jour', 'error');
      }
    }

    initRoles();

    // Particles
    (function() {
      const canvas = document.getElementById('particles-canvas');
      const ctx = canvas.getContext('2d');
      let particles = [];
      function resize() { canvas.width=window.innerWidth; canvas.height=window.innerHeight; }
      function createParticle() {
        return { x:Math.random()*canvas.width, y:Math.random()*canvas.height,
          size:Math.random()*1.2+0.3, speedY:-(Math.random()*0.25+0.08),
          speedX:(Math.random()-0.5)*0.15, opacity:Math.random()*0.5+0.15,
          life:0, maxLife:Math.random()*350+200 };
      }
      function init() { resize(); for(let i=0;i<60;i++) particles.push(createParticle()); window.addEventListener('resize',resize); }
      function animate() {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        particles.forEach((p,i)=>{
          p.x+=p.speedX; p.y+=p.speedY; p.life++;
          const r=p.life/p.maxLife;
          const a=r<0.2?r/0.2:r>0.8?(1-r)/0.2:1;
          ctx.globalAlpha=p.opacity*a; ctx.fillStyle='#c9a84c';
          ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
          if(p.life>=p.maxLife||p.y<0) particles[i]=createParticle();
        });
        ctx.globalAlpha=1; requestAnimationFrame(animate);
      }
      init(); animate();
    })();
  
