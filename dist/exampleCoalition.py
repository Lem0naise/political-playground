
def calculate_party_compatibility(player_candidate, potential_partner):
    """Calculate ideological compatibility between parties (0-100)"""
    total_distance = 0
    for i in range(len(VALUES)):
        player_val = player_candidate['vals'][i]
        partner_val = potential_partner['vals'][i]
        distance = abs(player_val - partner_val)

        if (player_val > 0 and partner_val <0) or (player_val <0 and partner_val>0):
            distance += 30 # add additional penalty if opposing views

        total_distance += distance
    
    # Convert to compatibility score (higher = more compatible)
    # Increase the multiplier to make coalitioning easier, was 150
    max_possible_distance = len(VALUES) * 100  # Max distance if parties are at opposite extremes
    compatibility = 100 - (total_distance / max_possible_distance * 100)
    return max(0, min(100, compatibility))

def present_coalition_question(partner_party, question_data, player_candidate):
    """Present a policy question to the player during coalition negotiations"""
    print(f"\n{partner_party['party']} wants to know your position on {question_data['topic']}:")
    print(f"'{question_data['question']}'")
    print()
    
    for i, option in enumerate(question_data['options']):
        print(f"{i+1}. {option['text']}")
    
    print()
    while True:
        try:
            choice = int(input("Your response (1-3): ")) - 1
            if 0 <= choice < len(question_data['options']):
                chosen_option = question_data['options'][choice]
                
                # Apply policy effect to player
                if 'effect' in chosen_option:
                    for value_key, change in chosen_option['effect'].items():
                        for i, val_key in enumerate(VALUES):
                            if val_key == value_key:
                                player_candidate['vals'][i] += change
                                player_candidate['vals'][i] = max(-100, min(100, player_candidate['vals'][i]))
                
                return chosen_option['appeal']
            else:
                print("Invalid choice. Please enter 1, 2, or 3.")
        except ValueError:
            print("Invalid input. Please enter a number.")

def negotiate_coalition_partner(player_candidate, partner_candidate, player_percentage):
    """Negotiate with a potential coalition partner"""
    print(f"\n" + "="*70)
    print(f"                COALITION NEGOTIATIONS")
    print(f"              Approaching {partner_candidate['party']}")
    print("="*70)
    
    compatibility = calculate_party_compatibility(player_candidate, partner_candidate)
    partner_percentage = 0  # Will be calculated from context
    
    # For partner percentage, we need to calculate it from context
    for i, (candidate, votes) in enumerate(RESULTS):
        if candidate == partner_candidate:
            total_votes = sum([r[1] for r in RESULTS])
            partner_percentage = (votes / total_votes * 100) if total_votes > 0 else 0
            break
    
    base_willingness = compatibility
    
    # Adjust willingness based on player's performance
    if player_percentage > 40:
        base_willingness += 15  # Strong mandate
    elif player_percentage > 30:
        base_willingness += 5   # Decent performance
    else:
        base_willingness -= 10  # Weak performance
    
    print(f"\nYou are meeting with {partner_candidate['party']} leadership...")
    print(f"Party strength: {partner_percentage:.1f}% of the vote")
    print(f"Initial assessment: {'Favorable' if base_willingness > 60 else 'Cautious' if base_willingness > 40 else 'Skeptical'}")
    
    # Coalition questions based on ideological differences
    questions = []
    
    # Economic policy question
    if abs(player_candidate['vals'][3] - partner_candidate['vals'][3]) > 20:  # soc_cap difference
        if partner_candidate['vals'][3] < player_candidate['vals'][3]:  # Partner is more left-wing
            questions.append({
                'topic': 'economic policy',
                'question': 'Will you commit to increasing social spending and workers\' rights?',
                'options': [
                    {'text': 'Yes, we will significantly increase social spending', 'appeal': 20, 'effect': {'soc_cap': -10}},
                    {'text': 'We can make some modest increases to social programs', 'appeal': 5, 'effect': {'soc_cap': -3}},
                    {'text': 'Our current economic platform is non-negotiable', 'appeal': -15, 'effect': {}}
                ]
            })
        else:  # Partner is more right-wing
            questions.append({
                'topic': 'economic policy',
                'question': 'Will you support business-friendly policies and reduce regulations?',
                'options': [
                    {'text': 'Yes, we will cut red tape and support businesses', 'appeal': 20, 'effect': {'soc_cap': 10}},
                    {'text': 'We can review some regulations for efficiency', 'appeal': 5, 'effect': {'soc_cap': 3}},
                    {'text': 'We believe current regulations are necessary', 'appeal': -15, 'effect': {}}
                ]
            })
    
    # Environmental policy question
    if abs(player_candidate['vals'][2] - partner_candidate['vals'][2]) > 25:  # env_eco difference
        if partner_candidate['vals'][2] < player_candidate['vals'][2]:  # Partner is more environmental
            questions.append({
                'topic': 'environmental policy',
                'question': 'Will you commit to aggressive climate action and green policies?',
                'options': [
                    {'text': 'Yes, climate action will be our top priority', 'appeal': 25, 'effect': {'env_eco': -15}},
                    {'text': 'We will take meaningful but measured environmental steps', 'appeal': 8, 'effect': {'env_eco': -5}},
                    {'text': 'Economic growth must come before environmental concerns', 'appeal': -20, 'effect': {}}
                ]
            })
        else:  # Partner is less environmental
            questions.append({
                'topic': 'environmental policy',
                'question': 'Will you support our ambitious climate action agenda?',
                'options': [
                    {'text': 'Yes, climate action is important for our future', 'appeal': 25, 'effect': {'env_eco': -15}},
                    {'text': 'We can support reasonable environmental measures', 'appeal': 8, 'effect': {'env_eco': -5}},
                    {'text': 'Environmental policy should not harm economic growth', 'appeal': -20, 'effect': {}}
                ]
            })
    
    # Social issues question
    if abs(player_candidate['vals'][0] - partner_candidate['vals'][0]) > 20:  # prog_cons difference
        if partner_candidate['vals'][0] < player_candidate['vals'][0]:  # Partner is more progressive
            questions.append({
                'topic': 'social issues',
                'question': 'Will you support progressive social reforms and minority rights?',
                'options': [
                    {'text': 'Yes, we will champion progressive social causes', 'appeal': 18, 'effect': {'prog_cons': -8}},
                    {'text': 'We support gradual social progress', 'appeal': 3, 'effect': {'prog_cons': -3}},
                    {'text': 'We prefer to focus on traditional values', 'appeal': -18, 'effect': {}}
                ]
            })
        else:  # Partner is more conservative
            questions.append({
                'topic': 'social issues',
                'question': 'Will you respect traditional values and institutions?',
                'options': [
                    {'text': 'Yes, we value tradition and stability', 'appeal': 18, 'effect': {'prog_cons': 8}},
                    {'text': 'We seek to balance tradition with necessary change', 'appeal': 3, 'effect': {'prog_cons': 3}},
                    {'text': 'We believe society needs rapid modernization', 'appeal': -18, 'effect': {}}
                ]
            })
    
    # Ask policy questions
    appeal_gained = 0
    for question in questions[:2]:  # Limit to 2 questions per partner
        appeal_gained += present_coalition_question(partner_candidate, question, player_candidate)
    
    # NEW: Parties make specific cabinet demands based on ideology
    print(f"\n{partner_candidate['party']} has specific cabinet position interests...")
    cabinet_importance = handle_partner_cabinet_demands(partner_candidate, player_candidate, partner_percentage)
    
    # Calculate cabinet appeal based on actual positions offered
    cabinet_appeal = calculate_cabinet_appeal(cabinet_importance, partner_percentage, compatibility)
    
    # Calculate final decision
    final_appeal = base_willingness + appeal_gained + (cabinet_appeal / 3)  # Scale cabinet appeal
    
    print(f"\n{partner_candidate['party']} is deliberating...")
    sleep(1)
    
    # Use the partner_considers_cabinet_offer function for consistency
    return partner_considers_cabinet_offer(partner_candidate, cabinet_importance, partner_percentage, compatibility)

def player_coalition_negotiations(player_candidate, winner_candidate, player_percentage, winner_percentage):
    """Handle coalition negotiations when the player is approached by the winner"""
    print(f"\n" + "="*70)
    print(f"                COALITION OFFER")
    print(f"         {winner_candidate['party']} approaches {player_candidate['party']}")
    print("="*70)
    
    compatibility = calculate_party_compatibility(player_candidate, winner_candidate)
    partner_percentage = 0  # Will be calculated from context
    
    # For partner percentage, we need to calculate it from context
    for i, (candidate, votes) in enumerate(RESULTS):
        if candidate == winner_candidate:
            total_votes = sum([r[1] for r in RESULTS])
            partner_percentage = (votes / total_votes * 100) if total_votes > 0 else 0
            break
    
    base_willingness = compatibility
    
    # Adjust willingness based on player's performance
    if player_percentage > 40:
        base_willingness += 15  # Strong mandate
    elif player_percentage > 30:
        base_willingness += 5   # Decent performance
    else:
        base_willingness -= 10  # Weak performance
    
    print(f"\nYou are meeting with {winner_candidate['party']} leadership...")
    print(f"Party strength: {partner_percentage:.1f}% of the vote")
    print(f"Initial assessment: {'Favorable' if base_willingness > 60 else 'Cautious' if base_willingness > 40 else 'Skeptical'}")
    
    # Show available cabinet positions
    available_positions = get_available_positions()
    if available_positions:
        print(f"\nAvailable cabinet positions:")
        for i, pos in enumerate(available_positions[:8], 1):  # Show top 8 available positions
            print(f"  {i}. {pos['name']} (Importance: {pos['importance']}) - {pos['description']}")
    
    # Winner asks policy questions to player
    questions = []
    
    # Economic policy question
    if abs(player_candidate['vals'][3] - winner_candidate['vals'][3]) > 20:  # soc_cap difference
        if player_candidate['vals'][3] < winner_candidate['vals'][3]:  # Player is more left-wing
            questions.append({
                'topic': 'economic policy',
                'question': 'We need to know - will you support our business-friendly economic policies?',
                'options': [
                    {'text': 'Yes, we can compromise on economic policy for the good of the country', 'appeal': 20, 'effect': {'soc_cap': 10}},
                    {'text': 'We can support some business measures but maintain worker protections', 'appeal': 5, 'effect': {'soc_cap': 3}},
                    {'text': 'Our economic principles are non-negotiable', 'appeal': -15, 'effect': {}}
                ]
            })
        else:  # Player is more right-wing
            questions.append({
                'topic': 'economic policy',
                'question': 'Will you accept our plans for increased social spending and regulation?',
                'options': [
                    {'text': 'Yes, we can support greater social investment', 'appeal': 20, 'effect': {'soc_cap': -10}},
                    {'text': 'We can accept modest increases if they are fiscally responsible', 'appeal': 5, 'effect': {'soc_cap': -3}},
                    {'text': 'We cannot support increased government spending', 'appeal': -15, 'effect': {}}
                ]
            })
    
    # Environmental policy question
    if abs(player_candidate['vals'][2] - winner_candidate['vals'][2]) > 25:  # env_eco difference
        if player_candidate['vals'][2] < winner_candidate['vals'][2]:  # Player is more environmental
            questions.append({
                'topic': 'environmental policy',
                'question': 'Can you accept a more gradual approach to environmental policy?',
                'options': [
                    {'text': 'Climate action can be phased in gradually for economic stability', 'appeal': 20, 'effect': {'env_eco': 10}},
                    {'text': 'We need some meaningful environmental commitments', 'appeal': 5, 'effect': {'env_eco': 5}},
                    {'text': 'Environmental action cannot be delayed or compromised', 'appeal': -20, 'effect': {}}
                ]
            })
        else:  # Player is less environmental
            questions.append({
                'topic': 'environmental policy',
                'question': 'Will you support our ambitious climate action agenda?',
                'options': [
                    {'text': 'Yes, climate action is important for our future', 'appeal': 25, 'effect': {'env_eco': -15}},
                    {'text': 'We can support reasonable environmental measures', 'appeal': 8, 'effect': {'env_eco': -5}},
                    {'text': 'Environmental policy should not harm economic growth', 'appeal': -20, 'effect': {}}
                ]
            })
    
    # Ask questions and calculate appeal
    appeal_from_player = 0
    for question in questions[:2]:  # Limit to 2 questions
        appeal_from_player += present_coalition_question(winner_candidate, question, player_candidate)
    
    # Player makes cabinet demands
    print(f"\n{winner_candidate['party']}: 'What would your party need to join our coalition?'")
    print("\nWhat cabinet position do you want?")
    
    if available_positions:
        for i, pos in enumerate(available_positions[:8], 1):
            print(f"{i}. {pos['name']} (Importance: {pos['importance']})")
        print(f"{len(available_positions[:8]) + 1}. No specific cabinet position needed")
        print(f"{len(available_positions[:8]) + 2}. We want to remain in opposition")
        
        while True:
            try:
                cabinet_choice = int(input(f"\nYour cabinet demand (1-{len(available_positions[:8]) + 2}): "))
                
                if cabinet_choice == len(available_positions[:8]) + 2:
                    print(f"\nYou decline the coalition offer.")
                    print(f"'{player_candidate['party']} believes we can serve the country better in opposition.'")
                    return False
                elif cabinet_choice == len(available_positions[:8]) + 1:
                    # No specific position
                    demanded_position = None
                    demand_importance = 0
                    break
                elif 1 <= cabinet_choice <= len(available_positions[:8]):
                    # Specific position demanded
                    demanded_position = available_positions[cabinet_choice - 1]['name']
                    demand_importance = available_positions[cabinet_choice - 1]['importance']
                    break
                else:
                    print("Invalid choice.")
                    
            except ValueError:
                print("Invalid input. Please enter a number.")
    else:
        # No positions available
        print("1. Just policy commitments, no cabinet positions available")
        print("2. We want to remain in opposition")
        
        while True:
            try:
                cabinet_choice = int(input("\nYour response (1-2): "))
                if cabinet_choice == 2:
                    print(f"\nYou decline the coalition offer.")
                    return False
                elif cabinet_choice == 1:
                    demanded_position = None
                    demand_importance = 0
                    break
                else:
                    print("Invalid choice.")
            except ValueError:
                print("Invalid input. Please enter a number.")
    
    # Calculate if winner accepts player's demands
    base_willingness = compatibility + appeal_from_player
    
    # Adjust based on how much winner needs the player
    seats_needed = max(0, 50 - winner_percentage)
    if player_percentage >= seats_needed:
        base_willingness += 20  # Player is essential
    elif player_percentage >= seats_needed * 0.7:
        base_willingness += 10  # Player is very helpful
    else:
        base_willingness += 5   # Player is somewhat helpful
    
    # Subtract demand cost
    demand_cost = demand_importance / 2  # Scale cabinet importance to cost
    final_willingness = base_willingness - demand_cost
    
    print(f"\n{winner_candidate['party']} considers your demands...")
    sleep(2)
    
    if final_willingness > 50:
        if demanded_position:
            allocate_position(demanded_position, player_candidate['party'])
            print(f"✅ {winner_candidate['party']} accepts!")
            print(f"'We agree to give {player_candidate['party']} the {demanded_position} position in our coalition government.'")
        else:
            print(f"✅ {winner_candidate['party']} accepts!")
            print(f"'We welcome {player_candidate['party']} to our coalition government.'")
        return True
    elif final_willingness > 25:
        print(f"🤔 {winner_candidate['party']}: 'Your demands are quite high. Let us consider other options first.'")
        print("They will get back to you after talking to other parties...")
        return False
    else:
        if demanded_position:
            print(f"❌ {winner_candidate['party']}: 'The {demanded_position} position is too important for what you bring to the coalition.'")
        else:
            print(f"❌ {winner_candidate['party']}: 'I'm afraid we cannot find common ground on policy issues.'")
        return False

def watch_coalition_formation(player_candidate, results, total_votes):
    """Handle coalition formation when player is not the winner"""
    # Reset cabinet for new government
    reset_cabinet_allocations()
    
    winner_candidate = results[0][0]
    winner_votes = results[0][1]
    winner_percentage = (winner_votes / total_votes * 100) if total_votes > 0 else 0
    
    # Reserve key positions for the leading party
    #allocate_position("Deputy Prime Minister", "Available")  # Will be decided by winner
    #allocate_position("Finance Minister", winner_candidate['party'])  # Leading party typically keeps finance
    
    # Find player's position and percentage
    player_percentage = 0
    player_position = 0
    for i, (candidate, votes) in enumerate(results):
        if candidate['is_player']:
            player_percentage = (votes / total_votes * 100) if total_votes > 0 else 0
            player_position = i + 1
            break
    
    if winner_percentage > 50:
        print(f"\n{winner_candidate['party']} has won a majority government.")
        return [winner_candidate]
    
    print(f"\n" + "="*70)
    print("                    COALITION FORMATION")
    print(f"               {winner_candidate['party']} seeks partners")
    print("="*70)
    print(f"\n{winner_candidate['party']} won {winner_percentage:.1f}% but needs coalition partners to govern.")
    print("You watch as they approach potential partners...")
    input("\nPress Enter to continue...")

    # Show what cabinet positions are available for negotiation
    available_positions = get_available_positions()
    if available_positions:
        print(f"\nKey cabinet positions available for coalition partners:")
        for pos in available_positions[:6]:  # Show top 6 most important available positions
            print(f"  • {pos['name']} (Importance: {pos['importance']}) - {pos['description']}")
    
    # Show all parties and their compatibility with winner
    potential_partners = []
    for i, (candidate, votes) in enumerate(results[1:6], 1):
        if candidate['is_player']:
            continue
        partner_percentage = (votes / total_votes * 100) if total_votes > 0 else 0
        compatibility = calculate_party_compatibility(winner_candidate, candidate)
        potential_partners.append((candidate, partner_percentage, compatibility))
    
    # Add player to the list
    player_compatibility = calculate_party_compatibility(winner_candidate, player_candidate)
    potential_partners.append((player_candidate, player_percentage, player_compatibility))
    
    # Sort by compatibility
    potential_partners.sort(key=lambda x: x[2], reverse=True)
    
    print(f"\nPotential coalition partners (sorted by compatibility):")
    for i, (candidate, percentage, compatibility) in enumerate(potential_partners):
        status = "YOU" if candidate['is_player'] else "Other Party"
        compat_text = "Highly Compatible" if compatibility > 70 else "Possible" if compatibility > 50 else "Difficult" if compatibility > 30 else "Practically Impossible"
        print(f"{i+1}. {candidate['party']:<50} {percentage:5.1f}% - {compat_text:<18} ({status})")
    
    coalition_partners = [winner_candidate]
    current_percentage = winner_percentage
    approached_player = False
    
    print(f"\nCoalition formation begins...")
    input("Press Enter to watch the negotiations...")
    
    # Winner approaches parties in order of compatibility
    for candidate, partner_percentage, compatibility in potential_partners:
        if current_percentage >= 50:
            break
            
        if candidate['is_player']:
            approached_player = True
            print(f"\n📞 {winner_candidate['party']} approaches YOUR party!")
            if player_coalition_negotiations(player_candidate, winner_candidate, player_percentage, winner_percentage):
                coalition_partners.append(player_candidate)
                current_percentage += player_percentage
                print(f"\n🤝 You have joined the coalition! Coalition strength: {current_percentage:.1f}%")
                if current_percentage >= 50:
                    print(f"🎉 The coalition has achieved a majority!")
                    break
            else:
                print(f"\n❌ Coalition negotiations with your party failed.")
        else:
            print(f"\n🤝 {winner_candidate['party']} approaches {candidate['party']}...")
            sleep(1)
            
            # Use detailed cabinet negotiation system for AI parties
            print(f"\n{candidate['party']} enters coalition talks with specific cabinet demands...")
            
            # Simulate cabinet demands from the AI party
            demanded_position, fallback_positions = partner_makes_cabinet_demands(candidate, partner_percentage)
            
            if demanded_position:
                print(f"{candidate['party']}: 'We require the {demanded_position} position for our cooperation.'")
                
                # Winner considers the demand
                base_chance = min(90, compatibility + 20)
                if partner_percentage >= (50 - current_percentage):
                    base_chance += 20  # Essential partner
                
                # Check if position is available
                available = get_available_positions()
                available_names = [pos['name'] for pos in available]
                
                if demanded_position in available_names:
                    # Position is available - higher chance of success
                    position_details = CABINET_POSITIONS[demanded_position]
                    allocate_position(demanded_position, candidate['party'])
                    
                    print(f"{winner_candidate['party']}: 'We can offer you the {demanded_position} position.'")
                    print(f"✅ {candidate['party']} accepts the coalition offer!")
                    
                    coalition_partners.append(candidate)
                    current_percentage += partner_percentage
                    print(f"   Coalition strength: {current_percentage:.1f}%")
                    
                    if current_percentage >= 50:
                        print(f"🎉 The coalition has achieved a majority!")
                        break
                elif fallback_positions:
                    # Try fallback positions
                    fallback_available = [pos for pos in fallback_positions if pos in available_names]
                    if fallback_available:
                        chosen_fallback = fallback_available[0]
                        position_details = CABINET_POSITIONS[chosen_fallback]
                        allocate_position(chosen_fallback, candidate['party'])
                        
                        print(f"{winner_candidate['party']}: 'The {demanded_position} is unavailable, but we can offer {chosen_fallback}.'")
                        
                        # Reduced chance of acceptance for fallback
                        if random.randint(1, 100) <= (base_chance - 15):
                            print(f"✅ {candidate['party']}: 'We accept the {chosen_fallback} position.'")
                            coalition_partners.append(candidate)
                            current_percentage += partner_percentage
                            print(f"   Coalition strength: {current_percentage:.1f}%")
                            
                            if current_percentage >= 50:
                                print(f"🎉 The coalition has achieved a majority!")
                                break
                        else:
                            print(f"❌ {candidate['party']}: 'This fallback offer is insufficient.'")
                    else:
                        print(f"❌ {winner_candidate['party']}: 'We cannot meet your cabinet requirements.'")
                        print(f"{candidate['party']} declines to join the coalition.")
                else:
                    print(f"❌ {winner_candidate['party']}: 'The {demanded_position} is not available.'")
                    print(f"{candidate['party']} declines to join the coalition.")
            else:
                # Party is flexible on positions
                print(f"{candidate['party']}: 'We're flexible on cabinet positions.'")
                
                # Offer available positions based on party size
                available = get_available_positions()
                if available:
                    if partner_percentage > 10:
                        # Offer significant position
                        offered_position = available[0]['name']  # Most important available
                    else:
                        # Offer junior position
                        junior_positions = [pos for pos in available if pos['importance'] <= 10]
                        offered_position = junior_positions[0]['name'] if junior_positions else available[-1]['name']
                    
                    allocate_position(offered_position, candidate['party'])
                    print(f"{winner_candidate['party']}: 'We offer you the {offered_position} position.'")
                    
                    # High chance of acceptance for flexible parties
                    if random.randint(1, 100) <= min(85, compatibility + 30):
                        print(f"✅ {candidate['party']}: 'We accept this generous offer!'")
                        coalition_partners.append(candidate)
                        current_percentage += partner_percentage
                        print(f"   Coalition strength: {current_percentage:.1f}%")
                        
                        if current_percentage >= 50:
                            print(f"🎉 The coalition has achieved a majority!")
                            break
                    else:
                        print(f"❌ {candidate['party']}: 'We cannot agree on policy terms.'")
                else:
                    print(f"❌ {winner_candidate['party']}: 'No cabinet positions remain available.'")
                    print(f"{candidate['party']} declines due to lack of cabinet representation.")
        
        if current_percentage < 50:
            input("Press Enter to continue...")
    
    # If player wasn't approached but coalition still needs partners
    if not approached_player and current_percentage < 50:
        remaining_need = 50 - current_percentage
        if player_percentage >= remaining_need * 0.5:  # Player could be helpful
            print(f"\n📞 With limited options remaining, {winner_candidate['party']} approaches YOUR party!")
            if player_coalition_negotiations(player_candidate, winner_candidate, player_percentage, winner_percentage):
                coalition_partners.append(player_candidate)
                current_percentage += player_percentage
                print(f"\n🤝 You have joined the coalition! Coalition strength: {current_percentage:.1f}%")
    
    if current_percentage < 50:
        print(f"\n⚠️  Coalition formation failed! {winner_candidate['party']} will attempt to form a minority government.")
        print(f"Final coalition strength: {current_percentage:.1f}%")
    
    # Show final cabinet allocation
    if len(coalition_partners) > 1:
        print(f"\n" + "="*70)
        print("                    FINAL CABINET")
        print("="*70)
        display_current_cabinet(player_candidate)
    
    return coalition_partners

def interactive_coalition_formation(player_candidate, results, total_votes):
    """Handle interactive coalition formation when player wins"""
    # Reset cabinet for new government
    reset_cabinet_allocations()
    
    # Reserve key positions for the leading party
    #allocate_position("Deputy Prime Minister", player_candidate['party'])  # Will be decided by player
    #allocate_position("Chancellor/Finance Minister", player_candidate['party'])  # Leading party typically keeps finance
    
    # todo removing

    player_votes = results[0][1]
    player_percentage = (player_votes / total_votes * 100) if total_votes > 0 else 0
    
    if player_percentage > 50:
        print(f"\n🎉 You won with a majority! No coalition needed.")
        print(f"\nAs the majority party, you control the entire cabinet.")
        return [player_candidate]
    
    print(f"\n" + "="*70)
    print("                    COALITION FORMATION")
    print("="*70)
    print(f"\nYou won {player_percentage:.1f}% of the vote, but need a coalition to govern.")
    print("You need to reach 50%+ to form a stable government.")
    input("\nPress Enter to continue...")

    print(f"\nAs the leading party, you automatically receive:")
    print(f"  • Prime Minister: {player_candidate['name']} ({player_candidate['party']})")
    
    # Show what cabinet positions are available for negotiation
    available_positions = get_available_positions()
    if available_positions:
        print(f"\nKey cabinet positions available for coalition partners:")
        for pos in available_positions[:6]:  # Show top 6 most important available positions
            print(f"  • {pos['name']} (Importance: {pos['importance']}) - {pos['description']}")
    
    print("\nAvailable potential partners:")
    
    # Show potential partners
    potential_partners = []
    current_coalition_percentage = player_percentage
    
    for i, (candidate, votes) in enumerate(results[1:6], 1):  # Top 5 other parties
        partner_percentage = (votes / total_votes * 100) if total_votes > 0 else 0
        compatibility = calculate_party_compatibility(player_candidate, candidate)
        
        print(f"{i}. {candidate['party']:<50} {partner_percentage:5.1f}% "
              f"({'Highly Compatible' if compatibility > 70 else 'Possible' if compatibility > 50 else 'Difficult' if compatibility > 30 else 'Impossible'})")
        potential_partners.append((candidate, partner_percentage, compatibility))
    
    # Coalition building process
    coalition_partners = [player_candidate]
    
    print(f"\nCurrent coalition strength: {current_coalition_percentage:.1f}%")
    print("Select parties to approach for coalition talks:")
    
    while current_coalition_percentage < 50:
        print(f"\nYou need {50 - current_coalition_percentage:.1f}% more for a majority.")
        print("0. Try to form a minority government")
        
        for i, (candidate, percentage, compatibility) in enumerate(potential_partners, 1):
            if candidate not in coalition_partners:
                print(f"{i}. Approach {candidate['party']} ({percentage:.1f}%)")
        
        try:
            choice = int(input("\nWho do you want to approach? "))
            
            if choice == 0:
                print(f"\nYou decide to attempt forming a minority government with {current_coalition_percentage:.1f}%")
                print("This will be challenging but might work with informal support...")
                break
            elif 1 <= choice <= len(potential_partners):
                target_candidate, target_percentage, compatibility = potential_partners[choice - 1]
                
                if target_candidate in coalition_partners:
                    print("You've already partnered with them!")
                    continue
                
                # Negotiate with chosen partner
                if negotiate_coalition_partner(player_candidate, target_candidate, player_percentage):
                    coalition_partners.append(target_candidate)
                    current_coalition_percentage += target_percentage
                    print(f"\nCoalition strength is now {current_coalition_percentage:.1f}%")

                    if current_coalition_percentage >= 50:
                        print(f"\n🎉 You have formed a majority coalition!")
                        input("Press Enter to continue...")
                        break
                else:
                    print(f"\nNegotiations with {target_candidate['party']} failed.")
                
                input("Press Enter to continue...")
            else:
                print("Invalid choice.")
                
        except ValueError:
            print("Invalid input. Please enter a number.")
    
    # Show final cabinet allocation
    if len(coalition_partners) > 1:
        print(f"\n" + "="*70)
        print("                    FINAL CABINET")
        print("="*70)
        display_current_cabinet(player_candidate)
    
    return coalition_partners

def reset_cabinet_allocations():
    """Reset the cabinet allocations for a new government"""
    global allocated_positions
    allocated_positions = {}

def get_available_positions():
    """Get list of available cabinet positions"""
    available = []
    for position, details in CABINET_POSITIONS.items():
        allocated_list = allocated_positions.get(position, [])
        allocated_count = len(allocated_list)  # Count the length of the list
        if allocated_count < details["max_slots"]:
            remaining = details["max_slots"] - allocated_count
            for i in range(remaining):
                available.append({
                    "name": position,
                    "importance": details["importance"],
                    "description": details["description"]
                })
    return sorted(available, key=lambda x: x["importance"], reverse=True)

def allocate_position(position_name, party_name):
    """Allocate a cabinet position to a party"""
    global allocated_positions
    if position_name not in allocated_positions:
        allocated_positions[position_name] = []
    allocated_positions[position_name].append(party_name)

def display_current_cabinet(player_candidate):
    """Display the current cabinet allocation"""
    if not allocated_positions:
        print("No positions allocated yet.")
        return
    
    print("\nCurrent Cabinet Allocation:")
    print(f"  • Prime Minister: {player_candidate['name']} ({player_candidate['party']})")
    for position, parties in allocated_positions.items():
        for party in parties:
            print(f"  • {position}: {party}")
    

def offer_cabinet_positions_to_partner(partner_candidate, player_candidate):
    """Interactive cabinet position negotiation"""
    available = get_available_positions()
    
    if not available:
        print(f"\n❌ No cabinet positions available to offer {partner_candidate['party']}!")
        return 0
    
    print(f"\n" + "="*80)
    print(f"                    CABINET NEGOTIATIONS")
    print(f"               Offering positions to {partner_candidate['party']}")
    print("="*80)
    
    display_current_cabinet(player_candidate)
    
    print(f"\nAvailable positions to offer (importance in parentheses):")
    for i, pos in enumerate(available[:8], 1):  # Show top 8 available positions
        print(f"{i}. {pos['name']} ({pos['importance']}) - {pos['description']}")
    
    print(f"{len(available[:8]) + 1}. Offer no cabinet positions (policy cooperation only)")
    
    total_importance = 0
    positions_offered = []
    
    print(f"\nWhat cabinet positions do you want to offer {partner_candidate['party']}?")
    print("You can offer multiple positions. Enter 0 when done, or choose the 'no positions' option.")
    
    while True:
        try:
            choice = int(input(f"\nChoose position to offer (1-{len(available[:8]) + 1}, or 0 to finish): "))
            
            if choice == 0:
                break
            elif choice == len(available[:8]) + 1:
                # No positions offered
                break
            elif 1 <= choice <= len(available[:8]):
                selected_pos = available[choice - 1]
                positions_offered.append(selected_pos)
                total_importance += selected_pos["importance"]
                allocate_position(selected_pos["name"], partner_candidate['party'])
                
                print(f"✓ Offered {selected_pos['name']} to {partner_candidate['party']}")
                
                # Update available list for next iteration
                available = get_available_positions()
                
                if not available:
                    print("No more positions available to offer.")
                    break
                    
                # Ask if they want to offer more
                more = input("Offer another position? (y/n): ").lower().strip()
                if more != 'y':
                    break
            else:
                print("Invalid choice.")
        except ValueError:
            print("Invalid input. Please enter a number.")
    
    if positions_offered:
        print(f"\nTotal package offered to {partner_candidate['party']}:")
        for pos in positions_offered:
            print(f"  • {pos['name']}")
        print(f"Total importance value: {total_importance}")
    else:
        print(f"\nNo cabinet positions offered to {partner_candidate['party']}.")
    
    return total_importance

def calculate_cabinet_appeal(importance_offered, partner_percentage, compatibility):
    """Calculate how appealing the cabinet offer is to the partner"""
    # Base appeal from importance of positions
    base_appeal = importance_offered * 1.5
    
    # Adjust based on party size - smaller parties are happier with smaller roles
    if partner_percentage < 5:
        base_appeal *= 1.2  # Smaller parties more grateful
    elif partner_percentage > 15:
        base_appeal *= 0.8  # Larger parties expect more
    
    # Adjust based on compatibility
    if compatibility > 70:
        base_appeal *= 1.1  # Compatible parties easier to please
    elif compatibility < 40:
        base_appeal *= 0.7  # Incompatible parties need more incentive
    
    return base_appeal

def partner_considers_cabinet_offer(partner_candidate, importance_offered, partner_percentage, compatibility):
    """Simulate partner's consideration of cabinet offer"""
    appeal = calculate_cabinet_appeal(importance_offered, partner_percentage, compatibility)
    
    print(f"\n{partner_candidate['party']} leadership meets to consider your offer...")
    sleep(1)
    
    # Decision thresholds
    if importance_offered == 0:
        appeal -= 20  # Penalty for no cabinet positions
        
    if appeal > 40:
        print(f"✅ {partner_candidate['party']}: 'We accept your generous offer!'")
        return True
    elif appeal > 20:
        print(f"🤔 {partner_candidate['party']}: 'This is a reasonable offer, we can work with this.'")
        return True
    elif appeal > 5:
        print(f"😐 {partner_candidate['party']}: 'We're not entirely satisfied, but we'll consider it...'")
        # 60% chance of acceptance for marginal offers
        sleep(1)
        if random.random() < 0.6:
            print(f"📞 After deliberation: 'We've decided to accept, despite our reservations.'")
            return True
        else:
            print(f"📞 After deliberation: 'We cannot accept this offer as it stands.'")
            return False
    else:
        print(f"❌ {partner_candidate['party']}: 'This offer is insufficient for our party's contribution.'")
        return False

def get_party_priority_positions(partner_candidate):
    """Determine which cabinet positions a party would most want based on their ideology"""
    priorities = []
    vals = partner_candidate['vals']
    
    # Map political values to preferred ministries
    # soc_cap (socialist-capitalist): index 3
    if vals[3] < -30:  # Socialist-leaning
        priorities.extend([("Finance Minister", 30), ("Health Minister", 25)])
    elif vals[3] > 30:  # Capitalist-leaning
        priorities.extend([("Finance Minister", 30), ("Transport Minister", 20)])
    
    # env_eco (environmental-economic): index 2
    if vals[2] < -20:  # Environmental-leaning
        priorities.append(("Environment Minister", 35))
    
    # pac_mil (pacifist-militarist): index 4
    if vals[4] > 30:  # Militarist
        priorities.append(("Defence Minister", 30))
    elif vals[4] < -30:  # Pacifist
        priorities.append(("Foreign Minister", 25))
    
    # nat_glob (nationalist-globalist): index 1
    if vals[1] < -20:  # Nationalist
        priorities.extend([("Home/Interior Minister", 25), ("Defense Minister", 20)])
    elif vals[1] > 20:  # Globalist
        priorities.append(("Foreign Minister", 30))
    
    # prog_cons (progressive-conservative): index 0
    if vals[0] < -20:  # Progressive
        priorities.extend([("Education Minister", 25), ("Justice Minister", 20)])
    elif vals[0] > 20:  # Conservative
        priorities.extend([("Justice Minister", 25), ("Home/Interior Minister", 20)])
    
    # Always interested in high-ranking positions
    priorities.extend([("Deputy Prime Minister", 40), ("Finance Minister", 35)])
    
    # Sort by priority and remove duplicates while keeping highest priority
    unique_priorities = {}
    for position, priority in priorities:
        if position not in unique_priorities or unique_priorities[position] < priority:
            unique_priorities[position] = priority
    
    return sorted(unique_priorities.items(), key=lambda x: x[1], reverse=True)[:4]  # Top 4 preferences

def partner_makes_cabinet_demands(partner_candidate, partner_percentage):
    """Partner makes specific cabinet position demands based on their ideology"""
    priorities = get_party_priority_positions(partner_candidate)
    available = get_available_positions()
    available_names = [pos['name'] for pos in available]
    
    # Filter priorities to only available positions
    available_priorities = [(pos, priority) for pos, priority in priorities if pos in available_names]
    
    if not available_priorities:
        return None, 0
    
    # Choose demand based on party size and compatibility
    if partner_percentage > 15:  # Large party - demands top position
        demanded_position = available_priorities[0][0]
        fallback_positions = [pos for pos, _ in available_priorities[1:3]]
    elif partner_percentage > 8:  # Medium party - wants significant role
        if len(available_priorities) >= 2:
            demanded_position = available_priorities[1][0]
            fallback_positions = [pos for pos, _ in available_priorities[2:4]]
        else:
            demanded_position = available_priorities[0][0]
            fallback_positions = []
    else:  # Small party - happy with any ministerial role
        demanded_position = available_priorities[-1][0] if available_priorities else None
        fallback_positions = []
    
    return demanded_position, fallback_positions

def handle_partner_cabinet_demands(partner_candidate, player_candidate, partner_percentage):
    """Handle specific cabinet position demands from coalition partner"""
    demanded_position, fallback_positions = partner_makes_cabinet_demands(partner_candidate, partner_percentage)
    
    if not demanded_position:
        print(f"\n{partner_candidate['party']}: 'We're flexible on cabinet positions. Any ministerial role would be appreciated.'")
        return offer_cabinet_positions_to_partner(partner_candidate, player_candidate)
    
    print(f"\n{partner_candidate['party']} has specific cabinet demands:")
    print(f"'We must insist on the {demanded_position} position for our party.'")
    
    if fallback_positions:
        print(f"'Alternatively, we could accept one of these positions: {', '.join(fallback_positions)}'")
    
    print("\nWhat is your response?")
    print(f"1. Agree to give them {demanded_position}")
    
    if fallback_positions:
        for i, pos in enumerate(fallback_positions[:2], 2):  # Max 2 fallback options
            print(f"{i}. Offer {pos} instead")
        next_option = len(fallback_positions[:2]) + 2
    else:
        next_option = 2
    
    print(f"{next_option}. Offer a different position of your choosing")
    print(f"{next_option + 1}. Refuse their demands - no major cabinet position")
    
    while True:
        try:
            choice = int(input(f"\nYour response (1-{next_option + 1}): "))
            
            if choice == 1:
                # Accept their main demand
                position_details = CABINET_POSITIONS[demanded_position]
                allocate_position(demanded_position, partner_candidate['party'])
                print(f"\n✅ You agree to give {partner_candidate['party']} the {demanded_position} position.")
                return position_details['importance']
                
            elif choice >= 2 and choice < next_option and fallback_positions:
                # Offer fallback position
                fallback_pos = fallback_positions[choice - 2]
                position_details = CABINET_POSITIONS[fallback_pos]
                allocate_position(fallback_pos, partner_candidate['party'])
                print(f"\n🤝 You counter-offer the {fallback_pos} position.")
                
                # Partner reaction to counter-offer
                if partner_percentage > 12:
                    print(f"{partner_candidate['party']}: 'This is not what we wanted, but we suppose it's acceptable.'")
                    return position_details['importance'] * 0.8  # Reduced satisfaction
                else:
                    print(f"{partner_candidate['party']}: 'We appreciate this significant role. Thank you.'")
                    return position_details['importance']
                    
            elif choice == next_option:
                # Offer different position
                return offer_cabinet_positions_to_partner(partner_candidate, player_candidate)
                
            elif choice == next_option + 1:
                # Refuse major positions
                print(f"\n❌ You refuse to give {partner_candidate['party']} a major cabinet position.")
                print(f"{partner_candidate['party']}: 'This is very disappointing. We expected better treatment.'")
                return -10  # Negative appeal for refusal
                
            else:
                print("Invalid choice.")
        