import React, { useEffect, useState } from 'react';
import Axios from 'axios';
import * as d3 from 'd3';
import moment from 'moment';
import { heroes_list } from 'assets/constants/heroes';
import { API_KEY, ACCOUNT_ID } from 'assets/constants/account';
import { useHistory } from 'react-router';

interface Peer {
    account_id: number;
    against_games: number;
    against_win: number;
    avatar: string;
    avatarfull: string;
    games: number;
    is_contributor: boolean;
    last_login: string;
    last_played: number;
    name: string;
    personaname: string;
    win: number;
    with_games: number;
    with_gpm_sum: number;
    with_win: number;
    with_xpm_sum: number;
}

interface Props {

}

export const PeersPage: React.FC<Props> = (props) => {
    const history = useHistory();
    const [lastPlayedTogether, setLastPlayedTogether] = useState('30');

    useEffect(() => {
        Axios.get(`/players/${ACCOUNT_ID}/peers`).then(res => {
            let margin = {
                top: 50,
                right: 200,
                bottom: 100,
                left: 100
            }
            let width = 1200 - margin.left - margin.right;
            let height = 700 - margin.top - margin.bottom;

            // RESET CHART
            d3.select('#chart').selectAll('*').remove();

            let svg = 
            d3.select('#chart')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.bottom + margin.top)
            .append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);

            let response: Peer[] = res.data;
            let data: Peer[] = [];

            let max = {
                win: 0,
                games: 0
            }

            for (let i = 0; i < response.length; i++) {
                if (response[i].last_played * 1000 > (new Date().getTime() - (parseInt(lastPlayedTogether) * 60 * 60 * 24 * 1000))) {
                    data.push(response[i]);
                    if (response[i].win > max.win) {
                        max.win = response[i].with_win;
                    }
    
                    if (response[i].games > max.games) {
                        max.games = response[i].with_games;
                    }
                }
            } 
            console.log(data);

            // ADD X AXIS
            let x =
            d3.scaleLog()
            .domain([1, max.games])
            .range([0, width]);
    
            svg.append("g")
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(10).tickSizeOuter(0).tickFormat(d3.formatPrefix('1.0', 1)))
            .attr('class', 'axisWhite')
    
            // ADD Y AXIS
            let y = d3.scaleLog()
            .domain([1, max.win])
            .range([ height, 0 ]);
    
            svg.append('g')
            .call(d3.axisLeft(y).tickFormat(d3.formatPrefix('1.0', 1)))
            .attr('class', 'axisWhite')

            // ADD PEERS TO CHART
            // svg.append('g')
            // .selectAll('image')
            // .data(data)
            // .enter().append('svg:image')
            // .attr('x', (d) => x(d.with_games))
            // .attr('y', (d) => y(d.with_win) - 40)
            // .attr('xlink:href', (d) => d.avatarfull)
            // .attr('class', 'avatar--small')
            // .attr('id', (d,i) => `peers-${i}`)

            svg.append('g')
            .selectAll('text')
            .data(data)
            .enter().append('text')
            .attr('x', (d) => x(d.with_games) - 20)
            .attr('y', (d) => y(d.with_win))
            .attr('fill', '#FFFFFF')
            .attr('class', 'small-text node')
            .attr('id', (d,i) => `peers-name-${d.account_id}`)
            .text((d) => d.personaname)
            .on('click', (d,i) => {
                let selectedNode = d3.select(`#peers-name-${d.account_id}`);

                // REMOVE SELECTED NODE
                d3.selectAll('.node').classed('node--selected', false);

                // ADD SELECTED NODE
                selectedNode.classed("node--selected", true);

                d3.select("#content__details").html('');
                d3.select("#content__details")
                .append('p')
                .html('Peer Details')
                .attr('class', 'white-text large-text')

                d3.select('#content__details')
                .append('p')
                .html(`
                    Name: ${d.personaname}<br/>
                    Number of games with this friend: ${d.with_games}<br/>
                    Win Rate with this friend: ${(d.with_win / d.with_games * 100).toFixed(2)}%<br/>
                    Last played: ${moment.utc(d.last_played * 1000).local().format('MM/DD/YYYY [at] HH:mm:ss')}<br/>
                `)
                .attr('class', 'white-text medium-text')
            })

            // ADD TREND LINE
            svg.append('line')
            .style('stroke', '#FF8000')
            .attr('x1', 1)
            .attr('x2', x(max.games))
            .attr('y1', y(1))
            .attr('y2', y(max.win))
            
            // ANNOTATION (HIGHLIGHT FRIENDS WHO HASN'T PLAYED THE LONGEST)
            let annotation = {
                last_played: 9999999999,
                x: 0,
                y: 0,
                message: '',
                player_id: 0,
                personaname: '',
                with_games: 0,
                win_rate: 0,
            
            }
            
            for (let i = 0; i < data.length; i++) {
                if (data[i].last_played < annotation.last_played) {
                    annotation.last_played = data[i].last_played;
                    annotation.x = data[i].with_games;
                    annotation.y = data[i].with_win;
                    annotation.message = `Last game with ${data[i].personaname} was on ${moment.utc(annotation.last_played * 1000).local().format('MM/DD/YYYY')}`;
                    annotation.player_id = data[i].account_id;
                    annotation.personaname = data[i].personaname;
                    annotation.with_games = data[i].with_games;
                    annotation.win_rate = data[i].with_win / data[i].with_games * 100;
                }
            }
            console.log(annotation);

            // ADD ANNOTATION TEXT
            svg.append('text')
            .attr('x', x(annotation.x))
            .attr('y', 50)
            .attr('text-anchor', 'middle')
            .style('fill', '#FFFFFF')
            .attr('class', 'small-text')
            .text(annotation.message);

            // HIGHLIGHT PEER
            d3.select("#content__details").html('');
            
            d3.select(`#peers-name-${annotation.player_id}`).classed('node--selected', true);

            d3.select("#content__details")
            .append('p')
            .html('Peer Details')
            .attr('class', 'white-text large-text');

            d3.select('#content__details')
            .append('p')
            .html(`
                Name: ${annotation.personaname}<br/>
                Number of games with this friend: ${annotation.with_games}<br/>
                Win Rate with this friend: ${annotation.win_rate.toFixed(2)}%<br/>
                Last played: ${moment.utc(annotation.last_played * 1000).local().format('MM/DD/YYYY [at] HH:mm:ss')}<br/>
            `)
            .attr('class', 'white-text medium-text')

            // ADDING ANNOTATION PATH TO TEXT
            svg.append('line')
            .style('stroke', '#FFFFFF')
            .attr('x1', x(annotation.x))
            .attr('x2', x(annotation.x))
            .attr('y1', 70)
            .attr('y2', y(annotation.y) - 20)

            // ADD LEGEND
            svg.append('text')
            .attr('x', x(max.games) + 46)
            .attr('y', 0)
            .text('Legend')
            .attr('class', 'medium-text')
            .attr('fill', '#FFFFFF');

            svg.append('circle')
            .attr('cx', x(max.games) + 50)
            .attr('cy', 20)
            .attr('r', 6)
            .style('fill', '#FF8000');

            svg.append('text')
            .attr('x', x(max.games) + 60)
            .attr('y', 24)
            .text('50% Win Rate')
            .attr('class', 'small-text')
            .attr('fill', '#FFFFFF')

            // ADD X LABEL
            svg.append("text")
            .attr("class", "small-text")
            .attr("text-anchor", "end")
            .attr("x", width)
            .attr("y", height + 40)
            .style('fill', "#FFFFFF")
            .text("Number of games");

            // ADD Y LABEL
            svg.append("text")
            .attr("class", "small-text")
            .attr("text-anchor", "end")
            .attr("y", -50)
            .attr("dy", ".75em")
            .attr("transform", "rotate(-90)")
            .style('fill', "#FFFFFF")
            .text("Total wins");
        })

    }, [lastPlayedTogether]);

    return (
        <div className="body">
            <div className="header">
                <div className="header__list">
                    <p className="large-text white-text" onClick={() => history.push('/')}>Recent Matches</p>
                </div>
                <div className="header__list">
                    <p className="large-text white-text" onClick={() => history.push('/heroes')}>Heroes</p>
                </div>
                <div className="header__list">
                    <p className="large-text white-text header__list__selected" onClick={() => history.push('/peers')}>Peers</p>
                </div>
            </div>
            <div className="content">
                <div className="content__left">
                    <p className="large-text white-text">Number of games vs. number of wins with your peers</p>
                    <div className="slider">
                        <div className="slider__label">
                            <p className="small-text white-text">1</p>
                            <p className="small-text white-text">Last game together in {lastPlayedTogether} days</p>
                            <p className="small-text white-text">365</p>
                        </div>
                        <input type="range" min="1" max="365" value={lastPlayedTogether} onChange={(e) => setLastPlayedTogether(e.target.value)}/>
                    </div>
                    <svg id="chart"/>
                </div>
                <div id="content__details">
                    <p className="white-text large-text">Peer Details</p>
                    <p className="lightgrey-text medium-text">Please click on the peer's name to see the peer details</p>
                </div>
            </div>
        </div>
    )
}